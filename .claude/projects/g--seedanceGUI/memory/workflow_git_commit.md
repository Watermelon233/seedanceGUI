---
name: git_commit_workflow
description: Git commit工作流程 - 每次任务开始前和完成后必须进行git commit
type: feedback
---

## Git Commit 工作流程规范

**规则**: 开始新任务之前和完成任务之后必须进行git commit

**Why**: 用户明确要求："注意 记录下来 开始新任务之前和完成任务以后进行gitcommit"，这是确保代码安全和可追溯的重要工作流程

**How to apply**:
1. **开始新任务前**: 先进行git commit，确保工作区干净
2. **任务完成后**: 立即进行git commit，记录本次工作的成果
3. **Commit message格式**: 使用清晰的中文描述，包含问题、解决方案、主要变更和测试结果
4. **Co-Authored-By**: 所有commit都要包含 `Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>`

**实施时间**: 2026年4月6日首次提出，立即生效

**例外情况**: 只有在明确获得用户豁免时才能跳过此步骤