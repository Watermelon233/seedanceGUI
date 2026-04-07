# Codex (GPT-5.4) 调用指南

> 环境：Windows, Codex CLI v0.118.0, ChatGPT 账号, config.toml 已配置 `web_search = "live"`

## 一、两种调用方式

### 1. `codex exec` 管道模式（推荐）

```bash
cd f:/DrugAgents
cat <<'PROMPT' | codex exec --full-auto -c 'reasoning_effort="xhigh"' -
你的任务描述...
PROMPT
```

| 参数 | 作用 |
|------|------|
| `--full-auto` | 无需人工审批，sandbox=workspace-write |
| `-c 'reasoning_effort="xhigh"'` | 最高推理强度 |
| 末尾 `-` | 从 stdin 读取 prompt |
| `-o <path>` | 将最后一条 message 写入文件（仅摘要） |

**后台运行**：在 Claude Code 的 Bash tool 中设 `run_in_background: true`。

### 2. codex:codex-rescue agent（不推荐）

通过 Claude Code 的 Agent tool 调用 `subagent_type: "codex:codex-rescue"`。问题：
- companion broker pipe 容易断裂卡死
- 只有 Bash 工具，没有 WebSearch/WebFetch
- 会花大量 token 读 skill 文件

## 二、三种使用场景

### 场景 A：代码/计划审核

Codex 最擅长的场景。能精确到行号交叉验证代码和计划。

```bash
cat <<'PROMPT' | codex exec --full-auto -c 'reasoning_effort="xhigh"' -
你是资深软件架构师。审核以下文件：
- path/to/plan.md
- path/to/code.py

背景知识（不需要 web search）：
- path/to/reference.md

重要：所有信息已在本地文件中，不需要搜索外部网站。

输出中文报告，写入 path/to/review_output.md
PROMPT
```

**注意**：涉及外部框架概念时加 `--disable web_search`，否则 Codex 会陷入搜索循环。简单代码分析不需要。



### 场景 C：Web Search 辅助搜索

Codex 有 web_search 工具，适合英文源。非英语源效果差。

```bash
cat <<'PROMPT' | codex exec --full-auto -c 'reasoning_effort="xhigh"' -
你必须使用 web_search 工具进行搜索。
搜索 DailyMed 中所有有 QT 警告的药物。
结果写入 path/to/output.jsonl
PROMPT
```

## 三、关键注意事项

### 模型配置
- 默认模型 `gpt-5.4`（config.toml 控制）
- `reasoning_effort="xhigh"` 是独立参数，**不是模型后缀**
- ❌ `-c 'model="gpt-5.4-xhigh"'` → 报错 "not supported"
- ✅ `-c 'reasoning_effort="xhigh"'` → 正确


### 已知坑

1. **stdin 卡死**：后台运行时必须用管道 `cat ... | codex exec ... -`
2. **API 限速**：无 API key 时 openFDA 限 40 次/分钟，Codex 写的脚本可能跑很久
3. **companion 断裂**：杀掉 codex.exe 后新调用会卡，直接用 `codex exec` 绕过
4. **web search 循环**：涉及外部框架文档时 Codex 会反复搜索卡死，加 `--disable web_search` 并在 prompt 中提供背景
