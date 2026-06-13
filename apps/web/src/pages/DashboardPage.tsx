import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCard {
  title: string;
  description: string;
}

const summaryCards: SummaryCard[] = [
  { title: "求职进度摘要", description: "画像完整度、默认简历、候选岗位数与待处理建议数将在此汇总。" },
  { title: "下一步行动", description: "AI 会根据上下文排序最影响求职效率的行动项。" },
  { title: "推荐组合概览", description: "各机会梯度岗位数量、平均匹配度与主要风险一览。" },
  { title: "最近报告", description: "最近生成的岗位匹配报告，AI 会标记高价值与待优化项。" },
];

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">AI 工作台</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          欢迎使用 Offer 捕手。完成求职画像与简历上传后，AI 将为你发现岗位、生成分层推荐并优化简历。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardTitle>{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
