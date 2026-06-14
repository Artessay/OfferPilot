import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { TieredRecommendationBoard } from "@/components/recommendation/TieredRecommendationBoard";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/spinner";
import { recommendationApi } from "@/lib/api/resources";

export function RecommendationPage() {
  const { recommendationId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["recommendations", recommendationId],
    queryFn: () => recommendationApi.get(recommendationId),
  });

  if (isLoading) return <LoadingBlock />;
  if (!data) return <p className="text-sm text-muted-foreground">推荐组合不存在。</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">分层岗位推荐</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          按机会梯度组织投递组合，每个岗位均展示匹配度、申请成功率预测、机会价值与风险。
        </p>
      </div>

      {data.summary ? (
        <Card>
          <CardContent className="pt-5 text-sm text-foreground">{data.summary}</CardContent>
        </Card>
      ) : null}

      <TieredRecommendationBoard tiers={data.tiers} />
    </div>
  );
}
