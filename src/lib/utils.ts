import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ResearchSession } from "@/types/research";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateString;
  }
}

export function formatFullDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return dateString;
  }
}

export function generateSessionMarkdown(session: ResearchSession): string {
  let md = `# DevResearch Brief: ${session.title}\n\n`;
  md += `**Problem:** ${session.problem}\n`;
  md += `**Date:** ${formatFullDate(session.createdAt)}\n`;
  md += `**Depth:** ${session.depth.toUpperCase()}\n`;
  md += `**Sources Explored:** ${session.selectedSources.join(', ')}\n\n`;
  md += `---\n\n`;

  if (session.rawMarkdownBrief) {
    md += session.rawMarkdownBrief;
  } else if (session.brief) {
    const b = session.brief;
    md += `## 1. Executive Summary\n${b.summary}\n\n`;
    
    md += `## 2. Possible Approaches & Tradeoffs\n`;
    for (const app of b.approaches) {
      md += `### ${app.approach} (${app.complexity} Complexity)\n`;
      md += `${app.description}\n\n`;
      md += `**Pros:**\n${app.pros.map((p) => `- ${p}`).join('\n')}\n\n`;
      md += `**Cons:**\n${app.cons.map((c) => `- ${c}`).join('\n')}\n\n`;
    }

    md += `## 3. Recommended Solution\n`;
    md += `### ${b.recommendedSolution.title}\n`;
    md += `${b.recommendedSolution.rationale}\n\n`;
    if (b.recommendedSolution.architectureNotes) {
      md += `**Architecture Considerations:**\n${b.recommendedSolution.architectureNotes}\n\n`;
    }
    md += `**Tradeoffs to Monitor:**\n${b.recommendedSolution.tradeoffs}\n\n`;

    if (b.codeSnippets?.length > 0) {
      md += `## 4. Implementation Snippets\n`;
      for (const snippet of b.codeSnippets) {
        md += `### ${snippet.title}\n`;
        md += `*${snippet.explanation}*\n\n`;
        md += "```" + `${snippet.language}\n${snippet.code}\n` + "```\n\n";
      }
    }

    if (b.keyPapersAndVideos?.length > 0) {
      md += `## 5. Key Papers, Videos & References\n`;
      for (const item of b.keyPapersAndVideos) {
        md += `- **[${item.citationId}] [${item.title}](${item.url})** (${item.type.toUpperCase()}): ${item.takeaway}\n`;
      }
      md += `\n`;
    }

    if (b.openQuestions?.length > 0) {
      md += `## 6. Open Questions & Edge Cases\n`;
      for (const q of b.openQuestions) {
        md += `- ${q}\n`;
      }
      md += `\n`;
    }
  }

  md += `---\n\n## Cited Sources & Evidence\n\n`;
  for (const s of session.sources) {
    md += `**[${s.citationId}] [${s.title}](${s.url})**  \n`;
    md += `*Type:* \`${s.type}\` | *Date:* ${s.date || 'N/A'}${s.credibilityScore ? ` | *Credibility:* ${s.credibilityScore}%` : ''}  \n`;
    md += `> ${s.snippet.replace(/\n/g, ' ')}\n\n`;
  }

  if (session.followUps?.length > 0) {
    md += `---\n\n## Follow-up Discussion\n\n`;
    for (const msg of session.followUps) {
      md += `### ${msg.role === 'user' ? 'Developer' : 'DevResearch AI'} (${formatFullDate(msg.timestamp)})\n`;
      md += `${msg.content}\n\n`;
    }
  }

  return md;
}

