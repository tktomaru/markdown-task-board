package api

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tktomaru/taskai/taskai-server/internal/models"
	"github.com/tktomaru/taskai/taskai-server/internal/repository"
)

// TaskPackRequest represents the request to generate a task pack
type TaskPackRequest struct {
	ProjectID      string   `json:"project_id" binding:"required"`
	TaskIDs        []string `json:"task_ids" binding:"required,min=1"`
	Template       string   `json:"template" binding:"required,oneof=IMPLEMENT BUGFIX RESEARCH REVIEW"`
	IncludeRelated bool     `json:"include_related"`
}

// TaskPackResponse represents the generated task pack
type TaskPackResponse struct {
	Markdown  string `json:"markdown"`
	TaskCount int    `json:"task_count"`
}

func (s *Server) handleGenerateTaskPack(c *gin.Context) {
	var req TaskPackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	// Log request
	fmt.Printf("Task Pack request: ProjectID=%s, TaskIDs=%v, Template=%s\n", req.ProjectID, req.TaskIDs, req.Template)

	// Create task repository
	taskRepo := repository.NewTaskRepository(s.db.DB)

	// Fetch all requested tasks
	tasks := make([]models.Task, 0, len(req.TaskIDs))
	for _, taskID := range req.TaskIDs {
		task, err := taskRepo.GetByID(c.Request.Context(), req.ProjectID, taskID)
		if err != nil {
			fmt.Printf("Failed to get task %s: %v\n", taskID, err)
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Task not found",
				"message": fmt.Sprintf("Task not found: %s (project: %s)", taskID, req.ProjectID),
			})
			return
		}
		tasks = append(tasks, *task)
	}

	fmt.Printf("Found %d tasks\n", len(tasks))

	// Generate task pack based on template
	markdown := generateTaskPackMarkdown(tasks, req.Template)
	fmt.Printf("Generated markdown: %d bytes\n", len(markdown))

	c.JSON(http.StatusOK, gin.H{
		"data": TaskPackResponse{
			Markdown:  markdown,
			TaskCount: len(tasks),
		},
	})
}

func generateTaskPackMarkdown(tasks []models.Task, template string) string {
	var sb strings.Builder

	// Header
	sb.WriteString("# AI Task Pack\n\n")
	sb.WriteString(fmt.Sprintf("**Generated**: %s\n", time.Now().Format("2006-01-02 15:04:05 MST")))
	sb.WriteString(fmt.Sprintf("**Template**: %s\n", template))
	sb.WriteString(fmt.Sprintf("**Task Count**: %d\n\n", len(tasks)))

	// Template-specific instructions
	switch template {
	case "IMPLEMENT":
		sb.WriteString("## Implementation Instructions\n\n")
		sb.WriteString("このタスクパックは新機能の実装のために準備されました。以下のタスクを順に実装してください：\n\n")
		sb.WriteString("- 各タスクの要件を確認\n")
		sb.WriteString("- 実装計画を立案\n")
		sb.WriteString("- テストケースを検討\n")
		sb.WriteString("- 実装を完了\n\n")
	case "BUGFIX":
		sb.WriteString("## Bug Fix Instructions\n\n")
		sb.WriteString("このタスクパックはバグ修正のために準備されました。以下の手順で対応してください：\n\n")
		sb.WriteString("- バグの再現手順を確認\n")
		sb.WriteString("- 原因を分析\n")
		sb.WriteString("- 修正方針を決定\n")
		sb.WriteString("- 修正を実装し、検証\n\n")
	case "RESEARCH":
		sb.WriteString("## Research Instructions\n\n")
		sb.WriteString("このタスクパックは調査・研究のために準備されました。以下を実施してください：\n\n")
		sb.WriteString("- 調査目的を明確化\n")
		sb.WriteString("- 調査項目をリストアップ\n")
		sb.WriteString("- 情報を収集・分析\n")
		sb.WriteString("- 結果をまとめる\n\n")
	case "REVIEW":
		sb.WriteString("## Review Instructions\n\n")
		sb.WriteString("このタスクパックはレビューのために準備されました。以下の観点で確認してください：\n\n")
		sb.WriteString("- コード品質\n")
		sb.WriteString("- セキュリティ\n")
		sb.WriteString("- パフォーマンス\n")
		sb.WriteString("- ドキュメント\n\n")
	}

	// Task overview table
	sb.WriteString("## Task Overview\n\n")
	sb.WriteString("| ID | Title | Status | Priority | Assignees |\n")
	sb.WriteString("|----|----|----|----|----|\n")
	for _, task := range tasks {
		assignees := "-"
		if len(task.Assignees) > 0 {
			assignees = strings.Join(task.Assignees, ", ")
		}
		sb.WriteString(fmt.Sprintf("| %s | %s | %s | %s | %s |\n",
			task.ID, task.Title, task.Status, task.Priority, assignees))
	}
	sb.WriteString("\n")

	// Detailed task information
	sb.WriteString("## Task Details\n\n")
	for i, task := range tasks {
		sb.WriteString(fmt.Sprintf("### Task %d: %s\n\n", i+1, task.Title))
		sb.WriteString(fmt.Sprintf("**ID**: `%s`\n\n", task.ID))

		// Metadata
		sb.WriteString("**Metadata**:\n\n")
		sb.WriteString(fmt.Sprintf("- **Status**: %s\n", task.Status))
		sb.WriteString(fmt.Sprintf("- **Priority**: %s\n", task.Priority))
		if len(task.Assignees) > 0 {
			sb.WriteString(fmt.Sprintf("- **Assignees**: %s\n", strings.Join(task.Assignees, ", ")))
		}
		if len(task.Labels) > 0 {
			sb.WriteString(fmt.Sprintf("- **Labels**: %s\n", strings.Join(task.Labels, ", ")))
		}
		if task.StartDate != nil {
			sb.WriteString(fmt.Sprintf("- **Start Date**: %s\n", task.StartDate.Format("2006-01-02")))
		}
		if task.DueDate != nil {
			sb.WriteString(fmt.Sprintf("- **Due Date**: %s\n", task.DueDate.Format("2006-01-02")))
		}

		// Summary from extra_meta if available
		if summary, ok := task.ExtraMeta["summary"].(string); ok && summary != "" {
			sb.WriteString(fmt.Sprintf("\n**Summary**: %s\n", summary))
		}

		// Task body
		sb.WriteString("\n**Description**:\n\n")
		if task.MarkdownBody != "" {
			sb.WriteString(task.MarkdownBody)
		} else {
			sb.WriteString("_(No description provided)_")
		}
		sb.WriteString("\n\n")

		// Separator between tasks
		if i < len(tasks)-1 {
			sb.WriteString("---\n\n")
		}
	}

	// Footer
	sb.WriteString("## Next Steps\n\n")
	sb.WriteString("1. このタスクパックを確認し、全体像を把握する\n")
	sb.WriteString("2. 優先順位に基づいてタスクを実行する\n")
	sb.WriteString("3. 進捗状況を随時更新する\n")
	sb.WriteString("4. 完了したタスクをレビューする\n\n")

	sb.WriteString("---\n\n")
	sb.WriteString("*Generated by TaskMD - Markdown-first task management*\n")

	return sb.String()
}
