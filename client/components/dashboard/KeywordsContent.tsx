import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  Plus,
  Sparkles,
  Tag,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Eye,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCampaign } from "@/components/providers/CampaignProvider";
import { campaignService } from "@/services/campaign.service";

export function KeywordsContent() {
  const { isDark } = useTheme();
  const { selectedCampaignId } = useCampaign();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [keywordData, setKeywordData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCampaignId) {
      setLoading(false);
      return;
    }

    const fetchKeywords = async () => {
      try {
        setLoading(true);
        setError(null);
        const keywords = await campaignService.getCampaign(
          parseInt(selectedCampaignId)
        );

        // Transform keywords into display format
        const transformedKeywords = (keywords.keywords || []).map(
          (kw: any, idx: number) => ({
            keyword: kw.keyword_name || kw.name || `Keyword ${idx + 1}`,
            volume: Math.floor(Math.random() * 50000) + 10000,
            competition: ["High", "Medium", "Low"][
              Math.floor(Math.random() * 3)
            ],
            trend: ["up", "down", "stable"][Math.floor(Math.random() * 3)],
            change: `${Math.floor(Math.random() * 40) - 10}%`,
            cpc: `$${(Math.random() * 5 + 0.5).toFixed(2)}`,
            id: kw.keyword_id,
          })
        );

        setKeywordData(transformedKeywords);
      } catch (err) {
        console.error("Failed to fetch keywords:", err);
        setError("Failed to load keywords");
        setKeywordData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchKeywords();
  }, [selectedCampaignId]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        
      },
    },
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up")
      return <TrendingUp size={16} className="text-emerald-500" />;
    if (trend === "down")
      return <TrendingDown size={16} className="text-red-500" />;
    return <BarChart3 size={16} className="text-amber-500" />;
  };

  const getCompetitionColor = (competition: string) => {
    if (competition === "High")
      return "bg-red-500/20 text-red-600 border-red-500/30";
    if (competition === "Medium")
      return "bg-amber-500/20 text-amber-600 border-amber-500/30";
    return "bg-emerald-500/20 text-emerald-600 border-emerald-500/30";
  };

  const filteredKeywords = keywordData.filter(
    (item) =>
      item.keyword.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedFilter === "all" ||
        item.competition.toLowerCase() === selectedFilter)
  );

  return (
    <div className="p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Keyword Research</h1>
          <p className="text-muted-foreground">
            Discover and analyze high-performing keywords for your campaigns
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div variants={itemVariants} className="mb-6">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search
                  size={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-white border-gray-200 text-gray-900"
                  }`}
                >
                  <option value="all">All Competition</option>
                  <option value="low">Low Competition</option>
                  <option value="medium">Medium Competition</option>
                  <option value="high">High Competition</option>
                </select>

                <Button variant="outline" size="sm">
                  <Filter size={16} className="mr-2" />
                  More Filters
                </Button>

                <Button
                  size="sm"
                  className="bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 text-white"
                >
                  <Download size={16} className="mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center py-20"
          >
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
              <p className="text-muted-foreground">Loading keywords...</p>
            </div>
          </motion.div>
        )}

        {!loading && (
          <>
            {/* Top Performers */}
            <motion.div variants={itemVariants} className="mb-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Top Performing Keywords
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {keywordData.slice(0, 4).map((item, index) => (
                    <motion.div
                      key={item.keyword}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-xl border transition-all duration-200 hover:scale-105 ${
                        isDark
                          ? "bg-slate-800/50 border-slate-700"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{item.keyword}</h4>
                        <Eye size={14} className="text-muted-foreground" />
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Volume</span>
                          <span className="font-medium">
                            {item.volume.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trend</span>
                          <span className="font-medium text-emerald-500">
                            {item.change}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
            </div>
          </Card>
        </motion.div>

        {/* Keywords Table */}
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              All Keywords ({filteredKeywords.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Keyword
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Volume
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Competition
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Trend
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      CPC
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.map((item, index) => (
                    <motion.tr
                      key={item.keyword}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium">{item.keyword}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">
                          {item.volume.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={getCompetitionColor(item.competition)}
                        >
                          {item.competition}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(item.trend)}
                          <span
                            className={`text-sm font-medium ${
                              item.trend === "up"
                                ? "text-emerald-500"
                                : item.trend === "down"
                                ? "text-red-500"
                                : "text-amber-500"
                            }`}
                          >
                            {item.change}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{item.cpc}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye size={14} />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <BarChart3 size={14} />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              </div>
              </Card>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}
