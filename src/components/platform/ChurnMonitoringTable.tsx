"use client";

import { PlanType } from "@prisma/client";

interface DistrictChurnData {
  id: string;
  name: string;
  code: string;
  planType: PlanType;
  subscriptionStatus: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
  lastUpdated: Date | null;
}

interface ChurnMonitoringTableProps {
  districts: DistrictChurnData[];
}

export default function ChurnMonitoringTable({ districts }: ChurnMonitoringTableProps) {
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return "text-red-600 font-bold";
    if (score >= 40) return "text-yellow-600 font-semibold";
    return "text-green-600";
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                District
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                Risk Score
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                Risk Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Reasons
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {districts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No districts found
                </td>
              </tr>
            ) : (
              districts.map((district) => (
                <tr key={district.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{district.name}</div>
                      <div className="text-sm text-slate-500">{district.code}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {district.planType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`text-sm font-semibold ${getRiskScoreColor(district.riskScore)}`}>
                      {district.riskScore}/100
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelColor(
                        district.riskLevel
                      )}`}
                    >
                      {district.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {district.reasons.length > 0 ? (
                      <ul className="text-sm text-slate-600 space-y-1">
                        {district.reasons.slice(0, 2).map((reason, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                        {district.reasons.length > 2 && (
                          <li className="text-xs text-slate-400">
                            +{district.reasons.length - 2} more
                          </li>
                        )}
                      </ul>
                    ) : (
                      <span className="text-sm text-slate-400">No issues detected</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(district.lastUpdated)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-600">Total Districts: </span>
              <span className="font-semibold text-slate-900">{districts.length}</span>
            </div>
            <div>
              <span className="text-slate-600">High Risk: </span>
              <span className="font-semibold text-red-600">
                {districts.filter((d) => d.riskLevel === "HIGH").length}
              </span>
            </div>
            <div>
              <span className="text-slate-600">Medium Risk: </span>
              <span className="font-semibold text-yellow-600">
                {districts.filter((d) => d.riskLevel === "MEDIUM").length}
              </span>
            </div>
            <div>
              <span className="text-slate-600">Low Risk: </span>
              <span className="font-semibold text-green-600">
                {districts.filter((d) => d.riskLevel === "LOW").length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

