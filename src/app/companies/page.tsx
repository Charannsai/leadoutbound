"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Building2,
  Search,
  Filter,
  Download,
  ExternalLink,
  Users,
  RefreshCw,
  Plus,
  Compass,
  ArrowRight,
  TrendingUp,
  MapPin,
  Building
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [sizeFilter, setSizeFilter] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch leads to extract companies
  const { data: leads = [], isLoading } = useQuery<any[]>({
    queryKey: ["companies-list", search, location, industry, sizeFilter.join(",")],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (location) params.set("location", location);
      if (industry) params.set("industry", industry);
      if (sizeFilter.length > 0) params.set("companySize", sizeFilter.join(","));

      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch companies data");
      return res.json();
    }
  });

  // Group contacts by company
  const getCompanyGrouped = () => {
    const groups: Record<string, any> = {};
    leads.forEach(l => {
      const comp = l.companyName;
      if (!groups[comp]) {
        groups[comp] = {
          id: l.id, // reference ID for quick actions
          companyName: comp,
          website: l.companyWebsite,
          location: l.location,
          industry: l.industry,
          size: l.companySize,
          contactsCount: 0,
          revenue: "$1M - $10M", // mock revenue
          funding: "Series A" // mock funding
        };
      }
      groups[comp].contactsCount++;
    });
    return Object.values(groups);
  };

  const companies = getCompanyGrouped();

  const handleSizeToggle = (size: string) => {
    setSizeFilter(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const clearAllFilters = () => {
    setSearch("");
    setLocation("");
    setIndustry("");
    setSizeFilter([]);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (companies.length === 0) {
      alert("No companies to export!");
      return;
    }

    const headers = ["Company Name", "Website", "Industry", "Location", "Size", "Total Contacts"];
    const rows = companies.map((c: any) => [
      c.companyName,
      c.website || "",
      c.industry || "",
      c.location || "",
      c.size || "",
      c.contactsCount
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apollo_companies_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Companies Catalog</h1>
          <p className="text-xs text-text-secondary">Discover B2B company size, technology stack, and export targeted lists.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-surface hover:bg-surface-secondary border border-border text-text-primary text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Companies List
          </button>
        </div>
      </div>

      {/* Main split dashboard */}
      <div className="flex gap-4 items-start relative h-[calc(100vh-120px)] overflow-hidden">
        {/* Left Filters Panel */}
        <div className="w-64 h-full bg-surface border border-border rounded-xl p-4 overflow-y-auto space-y-4 shadow-sm shrink-0 scrollbar-thin">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Company Filters
            </span>
            <button
              onClick={clearAllFilters}
              className="text-[10px] text-accent-500 hover:text-accent-600 font-bold hover:underline"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase">Company Name</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search name or website..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-secondary pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase">Headquarters</label>
            <input
              type="text"
              placeholder="e.g. San Francisco"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-surface-secondary px-2.5 py-1.5 text-xs rounded-lg border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase">Industry Sector</label>
            <input
              type="text"
              placeholder="e.g. Technology / Fintech"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full bg-surface-secondary px-2.5 py-1.5 text-xs rounded-lg border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase">Employee Size</label>
            <div className="space-y-1">
              {["1-10", "11-50", "51-200", "201-500", "500+"].map(size => (
                <label key={size} className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sizeFilter.includes(size)}
                    onChange={() => handleSizeToggle(size)}
                    className="rounded border-border focus:ring-accent-500/20 text-accent-500 cursor-pointer"
                  />
                  <span>{size} employees</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Table Container */}
        <div className="flex-1 h-full bg-surface border border-border rounded-xl shadow-sm flex flex-col justify-between overflow-hidden relative">
          <div className="px-4 py-3 border-b border-border bg-surface-secondary flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-text-secondary">{companies.length} companies matched</span>
          </div>

          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-12 bg-surface-tertiary rounded-xl animate-pulse" />
                ))}
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-20">
                <Building2 className="w-12 h-12 text-text-tertiary/20 mx-auto mb-3" />
                <p className="text-sm font-semibold text-text-secondary">No companies found</p>
                <p className="text-xs text-text-tertiary mt-1">Adjust search parameters or scrape targets using the AI Assistant.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-text-tertiary bg-surface-secondary/40 sticky top-0 backdrop-blur z-10 font-semibold">
                    <th className="py-2.5 px-4">Company Name</th>
                    <th className="py-2.5 px-2">Website</th>
                    <th className="py-2.5 px-2">Industry</th>
                    <th className="py-2.5 px-2">Size</th>
                    <th className="py-2.5 px-2">Headquarters</th>
                    <th className="py-2.5 px-2">Est. Revenue</th>
                    <th className="py-2.5 px-2">Funding</th>
                    <th className="py-2.5 px-2">Contacts</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c: any, index: number) => (
                    <tr key={index} className="border-b border-border/40 hover:bg-surface-secondary/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-text-primary flex items-center gap-2">
                        <Building className="w-4 h-4 text-text-tertiary" />
                        {c.companyName}
                      </td>
                      <td className="py-3 px-2">
                        {c.website ? (
                          <a href={c.website} target="_blank" rel="noreferrer" className="text-accent-500 hover:underline flex items-center gap-1 font-semibold">
                            {c.website.replace("https://", "").replace("http://", "")}
                            <ExternalLink className="w-3 h-3 text-text-tertiary" />
                          </a>
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-text-secondary font-medium">{c.industry || "Software Services"}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 bg-surface-secondary border border-border rounded text-[10px] text-text-secondary font-medium">
                          {c.size}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-text-secondary font-medium">{c.location || "Remote"}</td>
                      <td className="py-3 px-2 text-text-secondary font-semibold">{c.revenue}</td>
                      <td className="py-3 px-2 text-text-secondary font-semibold">
                        <span className="px-1.5 py-0.5 bg-success-500/10 text-success-600 rounded text-[9px] font-bold">
                          {c.funding}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-bold text-accent-500">{c.contactsCount} verified</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/search?search=${encodeURIComponent(c.companyName)}`}
                          className="px-2.5 py-1 bg-accent-500/10 text-accent-500 border border-accent-500/10 hover:bg-accent-500 hover:text-white rounded text-[10px] font-bold transition-all inline-block"
                        >
                          Show Contacts
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
