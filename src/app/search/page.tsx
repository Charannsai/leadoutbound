"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Search,
  Filter,
  Plus,
  Mail,
  Linkedin,
  MapPin,
  Building2,
  Download,
  FolderOpen,
  BookMarked,
  Layers,
  ChevronDown,
  RefreshCw,
  Sliders,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Bot
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/common/status-badge";
import { LeadRowSkeleton } from "@/components/common/skeletons";

export default function SearchPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"people" | "companies" | "saved" | "lists">("people");
  
  // Filter States
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [sizeFilter, setSizeFilter] = useState<string[]>([]);
  const [stageFilter, setStageFilter] = useState("");
  const [techFilter, setTechFilter] = useState("");
  const [fundingFilter, setFundingFilter] = useState("");
  const [revenueFilter, setRevenueFilter] = useState("");
  const [listIdFilter, setListIdFilter] = useState("");
  const [seqIdFilter, setSeqIdFilter] = useState("");

  // Grid Selection States
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Modals States
  const [showSeqModal, setShowSeqModal] = useState(false);
  const [targetSeqId, setTargetSeqId] = useState("");
  const [showListModal, setShowListModal] = useState(false);
  const [targetListId, setTargetListId] = useState("");
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [searchName, setSearchName] = useState("");

  // Reveal email state (stores leadIds for which email is visible)
  const [revealedEmails, setRevealedEmails] = useState<Record<string, boolean>>({});
  const [enrichingLeads, setEnrichingLeads] = useState<Record<string, boolean>>({});

  // Manual Lead Form States
  const [newLeadForm, setNewLeadForm] = useState({
    companyName: "",
    companyWebsite: "",
    contactName: "",
    contactEmail: "",
    contactTitle: "",
    location: "",
    industry: "",
    companySize: "11-50",
    contactLinkedin: ""
  });

  // Query database leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery<any[]>({
    queryKey: ["leads", keyword, location, industry, sizeFilter.join(","), stageFilter, listIdFilter, seqIdFilter, techFilter, fundingFilter, revenueFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.set("search", keyword);
      if (location) params.set("location", location);
      if (industry) params.set("industry", industry);
      if (sizeFilter.length > 0) params.set("companySize", sizeFilter.join(","));
      if (stageFilter) params.set("stage", stageFilter);
      if (listIdFilter) params.set("listId", listIdFilter);
      if (seqIdFilter) params.set("sessionId", seqIdFilter);
      if (techFilter) params.set("tech", techFilter);
      if (fundingFilter) params.set("funding", fundingFilter);
      if (revenueFilter) params.set("revenue", revenueFilter);

      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      return res.json();
    }
  });

  // Query lists & sequences for dropdown selection
  const { data: customLists = [] } = useQuery<any[]>({
    queryKey: ["custom-lists"],
    queryFn: async () => {
      const res = await fetch("/api/lists");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: sequences = [] } = useQuery<any[]>({
    queryKey: ["sequences"],
    queryFn: async () => {
      const res = await fetch("/api/sessions");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: savedSearches = [], refetch: refetchSaved } = useQuery<any[]>({
    queryKey: ["saved-searches"],
    queryFn: async () => {
      const res = await fetch("/api/saved-searches");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Enroll leads mutation
  const enrollMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enroll",
          leadIds: selectedLeadIds,
          targetSessionId: targetSeqId
        })
      });
      if (!res.ok) throw new Error("Enrollment failed");
      return res.json();
    },
    onSuccess: () => {
      setShowSeqModal(false);
      setSelectedLeadIds([]);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      alert("Selected contacts enrolled to sequence successfully!");
    }
  });

  // List assignment mutation
  const listAssignMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_to_list",
          leadIds: selectedLeadIds,
          listId: targetListId
        })
      });
      if (!res.ok) throw new Error("List mapping failed");
      return res.json();
    },
    onSuccess: () => {
      setShowListModal(false);
      setSelectedLeadIds([]);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
      alert("Selected contacts saved to list successfully!");
    }
  });

  // Save Search mutation
  const saveSearchMutation = useMutation({
    mutationFn: async () => {
      const currentFilters = {
        keyword, location, industry, sizeFilter, stageFilter, techFilter, fundingFilter, revenueFilter
      };
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: searchName,
          filters: currentFilters
        })
      });
      if (!res.ok) throw new Error("Failed to save search");
      return res.json();
    },
    onSuccess: () => {
      setShowSaveSearchModal(false);
      setSearchName("");
      refetchSaved();
      alert("Current search filters saved!");
    }
  });

  // Create manual lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          leadData: newLeadForm
        })
      });
      if (!res.ok) throw new Error("Lead creation failed");
      return res.json();
    },
    onSuccess: () => {
      setShowAddLeadModal(false);
      setNewLeadForm({
        companyName: "",
        companyWebsite: "",
        contactName: "",
        contactEmail: "",
        contactTitle: "",
        location: "",
        industry: "",
        companySize: "11-50",
        contactLinkedin: ""
      });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      alert("Contact created successfully!");
    }
  });

  // Enrich single lead via AI
  const handleEnrichLead = async (leadId: string) => {
    setEnrichingLeads(prev => ({ ...prev, [leadId]: true }));
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enrich_lead",
          leadId
        })
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        alert("Lead profile enriched successfully with AI!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEnrichingLeads(prev => ({ ...prev, [leadId]: false }));
    }
  };

  // Toggle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(leads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectRow = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(prev => [...prev, leadId]);
    } else {
      setSelectedLeadIds(prev => prev.filter(id => id !== leadId));
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const targets = selectedLeadIds.length > 0 
      ? leads.filter(l => selectedLeadIds.includes(l.id)) 
      : leads;

    if (targets.length === 0) {
      alert("No leads to export!");
      return;
    }

    const headers = ["Name", "Title", "Company", "Website", "Email", "LinkedIn", "Location", "Size", "Industry", "Stage"];
    const rows = targets.map(l => [
      l.contactName || "",
      l.contactTitle || "",
      l.companyName || "",
      l.companyWebsite || "",
      l.contactEmail || "",
      l.contactLinkedin || "",
      l.location || "",
      l.companySize || "",
      l.industry || "",
      l.pipelineStage || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apollo_leads_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Size Checkbox toggle
  const handleSizeToggle = (size: string) => {
    setSizeFilter(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const clearAllFilters = () => {
    setKeyword("");
    setLocation("");
    setIndustry("");
    setSizeFilter([]);
    setStageFilter("");
    setTechFilter("");
    setFundingFilter("");
    setRevenueFilter("");
    setListIdFilter("");
    setSeqIdFilter("");
  };

  // Group leads by company for the Companies tab
  const getCompanyGrouped = () => {
    const groups: Record<string, any> = {};
    leads.forEach(l => {
      const comp = l.companyName;
      if (!groups[comp]) {
        groups[comp] = {
          companyName: comp,
          website: l.companyWebsite,
          location: l.location,
          industry: l.industry,
          size: l.companySize,
          contactsCount: 0,
          contacts: []
        };
      }
      groups[comp].contactsCount++;
      groups[comp].contacts.push(l);
    });
    return Object.values(groups);
  };

  const companiesGrouped = getCompanyGrouped();

  return (
    <div className="space-y-4">
      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Search & Prospect</h1>
          <p className="text-xs text-text-secondary">Search the lead database, filter contacts, and add them directly into Sequences.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddLeadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-surface hover:bg-surface-secondary border border-border text-text-primary text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Contact
          </button>
          <Link
            href="/ai-assistant"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            AI Search Wizard
          </Link>
        </div>
      </div>

      {/* Grid Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border bg-surface p-1 rounded-xl shadow-sm h-11 shrink-0">
        <button
          onClick={() => { setActiveTab("people"); clearAllFilters(); }}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
            activeTab === "people" ? "bg-accent-500 text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
          )}
        >
          <Users className="w-3.5 h-3.5" />
          People Search
        </button>
        <button
          onClick={() => { setActiveTab("companies"); clearAllFilters(); }}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
            activeTab === "companies" ? "bg-accent-500 text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
          )}
        >
          <Building2 className="w-3.5 h-3.5" />
          Companies Search
        </button>
        <button
          onClick={() => { setActiveTab("saved"); clearAllFilters(); }}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
            activeTab === "saved" ? "bg-accent-500 text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
          )}
        >
          <BookMarked className="w-3.5 h-3.5" />
          Saved Searches
        </button>
        <button
          onClick={() => { setActiveTab("lists"); clearAllFilters(); }}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
            activeTab === "lists" ? "bg-accent-500 text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
          )}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Lists & Folders
        </button>
      </div>

      {/* Main Split Interface */}
      <div className="flex gap-4 items-start relative h-[calc(100vh-170px)] overflow-hidden">
        {/* Left Side Filters Sidebar (Render only if People or Companies tab is active) */}
        {(activeTab === "people" || activeTab === "companies") && (
          <div className="w-64 h-full bg-surface border border-border rounded-xl p-4 overflow-y-auto space-y-4 shadow-sm shrink-0 scrollbar-thin">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Filters
              </span>
              <button
                onClick={clearAllFilters}
                className="text-[10px] text-accent-500 hover:text-accent-600 font-bold hover:underline"
              >
                Clear All
              </button>
            </div>

            {/* Keyword search input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase">Keyword Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Name, title, company..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full bg-surface-secondary pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500"
                />
              </div>
            </div>

            {/* Location filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase">Location</label>
              <input
                type="text"
                placeholder="e.g. San Francisco / Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-surface-secondary px-2.5 py-1.5 text-xs rounded-lg border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500"
              />
            </div>

            {/* Industry filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase">Industry</label>
              <input
                type="text"
                placeholder="e.g. SaaS / Database"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-surface-secondary px-2.5 py-1.5 text-xs rounded-lg border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500"
              />
            </div>

            {/* Company size checklists */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase">Company Size</label>
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

            {/* Technologies used */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase">Tech Stack</label>
              <input
                type="text"
                placeholder="Next.js, Python, Postgres..."
                value={techFilter}
                onChange={(e) => setTechFilter(e.target.value)}
                className="w-full bg-surface-secondary px-2.5 py-1.5 text-xs rounded-lg border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500"
              />
            </div>

            {/* Funding stage */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase">Funding Stage</label>
              <select
                value={fundingFilter}
                onChange={(e) => setFundingFilter(e.target.value)}
                className="w-full bg-surface-secondary px-2.5 py-1.5 text-xs rounded-lg border border-border text-text-primary focus:outline-none focus:border-accent-500"
              >
                <option value="">All Funding Stages</option>
                <option value="Seed">Seed</option>
                <option value="Series A">Series A</option>
                <option value="Series B">Series B</option>
                <option value="Series C">Series C</option>
                <option value="Series D">Series D</option>
                <option value="IPO">IPO</option>
                <option value="Bootstrap">Bootstrap</option>
              </select>
            </div>

            {/* Revenue range */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase">Revenue Range</label>
              <select
                value={revenueFilter}
                onChange={(e) => setRevenueFilter(e.target.value)}
                className="w-full bg-surface-secondary px-2.5 py-1.5 text-xs rounded-lg border border-border text-text-primary focus:outline-none focus:border-accent-500"
              >
                <option value="">All Revenues</option>
                <option value="Under $1M">Under $1M</option>
                <option value="$1M-$10M">$1M-$10M</option>
                <option value="$10M-$50M">$10M-$50M</option>
                <option value="$50M+">$50M+</option>
              </select>
            </div>

            {/* Pipeline Stage */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase">Pipeline Stage</label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="w-full bg-surface-secondary px-2.5 py-1.5 text-xs rounded-lg border border-border text-text-primary focus:outline-none focus:border-accent-500"
              >
                <option value="">All Stages</option>
                <option value="generated">Generated</option>
                <option value="qualified">Qualified</option>
                <option value="personalized">Personalized</option>
                <option value="approved">Approved</option>
                <option value="sent">Sent</option>
                <option value="replied">Replied</option>
                <option value="rejected">Rejected</option>
                <option value="bounced">Bounced</option>
              </select>
            </div>
          </div>
        )}

        {/* Right Side Database Content Area */}
        <div className="flex-1 h-full bg-surface border border-border rounded-xl shadow-sm flex flex-col justify-between overflow-hidden relative">
          
          {/* Action Bar inside panel */}
          {(activeTab === "people" || activeTab === "companies") && (
            <div className="px-4 py-3 border-b border-border bg-surface-secondary flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-text-secondary">
                  {activeTab === "people" ? `${leads.length} contacts found` : `${companiesGrouped.length} companies found`}
                </span>
                {selectedLeadIds.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-accent-500 text-white rounded-full">
                    {selectedLeadIds.length} Selected
                  </span>
                )}
              </div>

              {/* Bulk actions triggers */}
              <div className="flex items-center gap-2">
                {selectedLeadIds.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowSeqModal(true)}
                      className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-surface-secondary border border-border text-accent-500 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Add to Sequence
                    </button>
                    <button
                      onClick={() => setShowListModal(true)}
                      className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-surface-secondary border border-border text-text-primary text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-text-tertiary" />
                      Save to List
                    </button>
                  </>
                )}
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-surface-secondary border border-border text-text-secondary hover:text-text-primary text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {selectedLeadIds.length > 0 ? "Export Selected" : "Export CSV"}
                </button>
                {activeTab === "people" && (
                  <button
                    onClick={() => setShowSaveSearchModal(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-surface-secondary border border-border text-text-secondary hover:text-text-primary text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <BookMarked className="w-3.5 h-3.5" />
                    Save Search
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Grid content view */}
          <div className="flex-1 overflow-auto">
            {leadsLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-12 bg-surface-tertiary rounded-xl animate-pulse" />
                ))}
              </div>
            ) : activeTab === "people" ? (
              leads.length === 0 ? (
                <div className="text-center py-20">
                  <SlidersHorizontal className="w-12 h-12 text-text-tertiary/20 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-text-secondary">No contacts found</p>
                  <p className="text-xs text-text-tertiary mt-1">Try clearing some filter criteria, or run an AI Search query to scrape new contacts.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-text-tertiary bg-surface-secondary/40 sticky top-0 backdrop-blur z-10">
                      <th className="py-2.5 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.length === leads.length && leads.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-border focus:ring-accent-500/20 text-accent-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-2 font-medium">Contact</th>
                      <th className="py-2.5 px-2 font-medium">Company</th>
                      <th className="py-2.5 px-2 font-medium">Email</th>
                      <th className="py-2.5 px-2 font-medium">LinkedIn</th>
                      <th className="py-2.5 px-2 font-medium">Location</th>
                      <th className="py-2.5 px-2 font-medium">Size</th>
                      <th className="py-2.5 px-2 font-medium">Stage</th>
                      <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => {
                      const showEmail = revealedEmails[lead.id];
                      const isEnriching = enrichingLeads[lead.id];
                      let parsedRaw: any = {};
                      try { parsedRaw = JSON.parse(lead.rawData || "{}"); } catch {}

                      return (
                        <tr key={lead.id} className="border-b border-border/40 hover:bg-surface-secondary/30 transition-colors">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead.id)}
                              onChange={(e) => handleSelectRow(lead.id, e.target.checked)}
                              className="rounded border-border focus:ring-accent-500/20 text-accent-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <div className="font-semibold text-text-primary leading-tight">{lead.contactName}</div>
                            <div className="text-[10px] text-text-secondary leading-tight mt-0.5">{lead.contactTitle}</div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-text-primary">{lead.companyName}</span>
                              {lead.companyWebsite && (
                                <a href={lead.companyWebsite} target="_blank" rel="noreferrer" className="text-text-tertiary hover:text-accent-500">
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <div className="text-[9px] text-text-tertiary mt-0.5">{lead.industry}</div>
                          </td>
                          <td className="py-3 px-2">
                            {lead.contactEmail ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium">
                                  {showEmail ? lead.contactEmail : "••••••••@••••.•••"}
                                </span>
                                <span className="px-1 py-0.5 bg-success-500/10 text-success-600 text-[8px] font-bold rounded">
                                  Verified
                                </span>
                                {!showEmail && (
                                  <button
                                    onClick={() => setRevealedEmails(prev => ({ ...prev, [lead.id]: true }))}
                                    className="text-[9px] text-accent-500 hover:text-accent-600 font-bold hover:underline"
                                  >
                                    Reveal
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-text-tertiary font-medium">Not found</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            {lead.contactLinkedin ? (
                              <a href={lead.contactLinkedin} target="_blank" rel="noreferrer" className="p-1 rounded bg-accent-500/10 text-accent-500 hover:bg-accent-500 hover:text-white transition-all inline-block">
                                <Linkedin className="w-3.5 h-3.5 fill-current border-none" />
                              </a>
                            ) : (
                              <span className="text-text-tertiary">—</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-text-secondary font-medium">{lead.location || "Remote"}</td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 bg-surface-secondary border border-border rounded text-[10px] text-text-secondary font-medium">
                              {lead.companySize}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <StatusBadge status={lead.pipelineStage} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleEnrichLead(lead.id)}
                              disabled={isEnriching}
                              className={cn(
                                "flex items-center gap-1 ml-auto px-2 py-1 border border-border hover:bg-surface-secondary text-text-secondary hover:text-accent-500 text-[10px] font-semibold rounded transition-all cursor-pointer",
                                isEnriching && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <RefreshCw className={cn("w-3 h-3", isEnriching && "animate-spin")} />
                              {isEnriching ? "Enriching..." : "Enrich Profile"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : activeTab === "companies" ? (
              companiesGrouped.length === 0 ? (
                <div className="text-center py-20 text-text-tertiary">No companies matching search filters.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-text-tertiary bg-surface-secondary/40 sticky top-0 backdrop-blur z-10">
                      <th className="py-2.5 px-4 font-medium">Company</th>
                      <th className="py-2.5 px-2 font-medium">Domain</th>
                      <th className="py-2.5 px-2 font-medium">Industry</th>
                      <th className="py-2.5 px-2 font-medium">Size</th>
                      <th className="py-2.5 px-2 font-medium">Location</th>
                      <th className="py-2.5 px-2 font-medium">Contacts</th>
                      <th className="py-2.5 px-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companiesGrouped.map((c: any, idx: number) => (
                      <tr key={idx} className="border-b border-border/40 hover:bg-surface-secondary/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-text-primary">{c.companyName}</td>
                        <td className="py-3 px-2">
                          {c.website ? (
                            <a href={c.website} target="_blank" rel="noreferrer" className="text-accent-500 hover:underline flex items-center gap-1 font-medium">
                              {c.website.replace("https://", "")}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-text-tertiary">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-text-secondary font-medium">{c.industry || "Technology"}</td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-0.5 bg-surface-secondary border border-border rounded text-[10px] text-text-secondary font-medium">
                            {c.size}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-text-secondary font-medium">{c.location || "Remote"}</td>
                        <td className="py-3 px-2 font-bold text-accent-500">{c.contactsCount} leads</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => { setKeyword(c.companyName); setActiveTab("people"); }}
                            className="px-2 py-1 bg-accent-500/10 text-accent-500 border border-accent-500/10 hover:bg-accent-500 hover:text-white rounded text-[10px] font-bold transition-all"
                          >
                            Browse Contacts
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : activeTab === "saved" ? (
              savedSearches.length === 0 ? (
                <div className="text-center py-20 text-text-tertiary">No saved searches yet. Save your filters from the Actions bar.</div>
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {savedSearches.map((s: any) => {
                    const filters = JSON.parse(s.filters);
                    return (
                      <div key={s.id} className="border border-border rounded-xl p-4 bg-surface-secondary/40 space-y-3">
                        <div>
                          <h4 className="font-bold text-xs text-text-primary">{s.name}</h4>
                          <p className="text-[10px] text-text-tertiary mt-0.5">Created on {new Date(s.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[9px] text-text-secondary">
                          {filters.keyword && <span>Keyword: {filters.keyword}</span>}
                          {filters.location && <span>Location: {filters.location}</span>}
                          {filters.industry && <span>Industry: {filters.industry}</span>}
                          {filters.sizeFilter?.length > 0 && <span>Size: {filters.sizeFilter.join(", ")}</span>}
                        </div>
                        <button
                          onClick={() => {
                            setKeyword(filters.keyword || "");
                            setLocation(filters.location || "");
                            setIndustry(filters.industry || "");
                            setSizeFilter(filters.sizeFilter || []);
                            setStageFilter(filters.stageFilter || "");
                            setTechFilter(filters.techFilter || "");
                            setFundingFilter(filters.fundingFilter || "");
                            setRevenueFilter(filters.revenueFilter || "");
                            setActiveTab("people");
                          }}
                          className="w-full py-1.5 bg-accent-500 hover:bg-accent-600 text-white font-bold rounded-lg text-[10px] transition-colors"
                        >
                          Load Search
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              // Lists Tab
              customLists.length === 0 ? (
                <div className="text-center py-20 text-text-tertiary">No lists found. Click 'Save to List' on checked rows to create folder lists.</div>
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {customLists.map((list: any) => (
                    <div key={list.id} className="border border-border rounded-xl p-4 bg-surface-secondary/40 flex flex-col justify-between h-32">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-text-primary">{list.name}</h4>
                          <span className="px-2 py-0.5 bg-accent-500/10 text-accent-500 text-[10px] font-bold rounded-full">{list._count?.leads || 0} leads</span>
                        </div>
                        <p className="text-[10px] text-text-secondary mt-1.5 line-clamp-2">{list.description || "No description provided."}</p>
                      </div>
                      <button
                        onClick={() => { setListIdFilter(list.id); setActiveTab("people"); }}
                        className="w-full py-1.5 bg-accent-500 hover:bg-accent-600 text-white font-bold rounded-lg text-[10px] transition-colors mt-3"
                      >
                        Browse List Contacts
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Add to Sequence */}
      {showSeqModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Enroll Contacts into Sequence</h3>
              <p className="text-xs text-text-secondary mt-1">Select the sequence sequence to enroll the {selectedLeadIds.length} checked contacts into.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase">Target Sequence</label>
              <select
                value={targetSeqId}
                onChange={(e) => setTargetSeqId(e.target.value)}
                className="w-full bg-surface-secondary px-3 py-2 border border-border rounded-lg text-xs text-text-primary focus:outline-none"
              >
                <option value="">-- Choose Sequence --</option>
                {sequences.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} ({s._count?.leads} leads)</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => { setShowSeqModal(false); setTargetSeqId(""); }}
                className="px-4 py-2 border border-border hover:bg-surface-secondary text-text-secondary font-semibold rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => enrollMutation.mutate()}
                disabled={!targetSeqId || enrollMutation.isPending}
                className="px-4 py-2 bg-accent-500 hover:bg-accent-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
              >
                {enrollMutation.isPending ? "Enrolling..." : "Confirm Enrollment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Save to List */}
      {showListModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Save Contacts to Custom List</h3>
              <p className="text-xs text-text-secondary mt-1">Select an existing list or create a new mapping list to hold these {selectedLeadIds.length} contacts.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase">Choose List</label>
              <select
                value={targetListId}
                onChange={(e) => setTargetListId(e.target.value)}
                className="w-full bg-surface-secondary px-3 py-2 border border-border rounded-lg text-xs text-text-primary focus:outline-none"
              >
                <option value="">-- Choose List --</option>
                {customLists.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name} ({l._count?.leads} leads)</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => { setShowListModal(false); setTargetListId(""); }}
                className="px-4 py-2 border border-border hover:bg-surface-secondary text-text-secondary font-semibold rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => listAssignMutation.mutate()}
                disabled={!targetListId || listAssignMutation.isPending}
                className="px-4 py-2 bg-accent-500 hover:bg-accent-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
              >
                {listAssignMutation.isPending ? "Saving..." : "Confirm Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Save Current Search Filters */}
      {showSaveSearchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Save Current Search Filters</h3>
              <p className="text-xs text-text-secondary mt-1">Provide a name to save these active search filters for fast lookup later.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase">Search Name</label>
              <input
                type="text"
                placeholder="e.g. Bay Area CEOs"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full bg-surface-secondary px-3 py-2 border border-border rounded-lg text-xs text-text-primary focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => { setShowSaveSearchModal(false); setSearchName(""); }}
                className="px-4 py-2 border border-border hover:bg-surface-secondary text-text-secondary font-semibold rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => saveSearchMutation.mutate()}
                disabled={!searchName.trim() || saveSearchMutation.isPending}
                className="px-4 py-2 bg-accent-500 hover:bg-accent-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
              >
                {saveSearchMutation.isPending ? "Saving..." : "Save Search"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Create Manual Contact */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-surface border border-border p-6 rounded-2xl w-full max-w-lg shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-sm font-bold text-text-primary">Create New B2B Lead Contact</h3>
              <button onClick={() => setShowAddLeadModal(false)} className="text-text-tertiary hover:text-text-primary text-xs">Close</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-text-secondary">Contact Name*</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newLeadForm.contactName}
                  onChange={(e) => setNewLeadForm(prev => ({ ...prev, contactName: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-1.5 border border-border rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-text-secondary">Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. VP Engineering"
                  value={newLeadForm.contactTitle}
                  onChange={(e) => setNewLeadForm(prev => ({ ...prev, contactTitle: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-1.5 border border-border rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-text-secondary">Contact Email*</label>
                <input
                  type="email"
                  placeholder="e.g. john@company.com"
                  value={newLeadForm.contactEmail}
                  onChange={(e) => setNewLeadForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-1.5 border border-border rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-text-secondary">LinkedIn URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://linkedin.com/in/..."
                  value={newLeadForm.contactLinkedin}
                  onChange={(e) => setNewLeadForm(prev => ({ ...prev, contactLinkedin: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-1.5 border border-border rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-text-secondary">Company Name*</label>
                <input
                  type="text"
                  placeholder="e.g. Supabase"
                  value={newLeadForm.companyName}
                  onChange={(e) => setNewLeadForm(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-1.5 border border-border rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-text-secondary">Company Website</label>
                <input
                  type="text"
                  placeholder="e.g. https://supabase.com"
                  value={newLeadForm.companyWebsite}
                  onChange={(e) => setNewLeadForm(prev => ({ ...prev, companyWebsite: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-1.5 border border-border rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-text-secondary">Location</label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, CA"
                  value={newLeadForm.location}
                  onChange={(e) => setNewLeadForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-1.5 border border-border rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-text-secondary">Industry</label>
                <input
                  type="text"
                  placeholder="e.g. Developer Tools"
                  value={newLeadForm.industry}
                  onChange={(e) => setNewLeadForm(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-1.5 border border-border rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="font-bold text-text-secondary">Company Size</label>
                <select
                  value={newLeadForm.companySize}
                  onChange={(e) => setNewLeadForm(prev => ({ ...prev, companySize: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-1.5 border border-border rounded-lg focus:outline-none"
                >
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="px-4 py-2 border border-border hover:bg-surface-secondary text-text-secondary font-semibold rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => createLeadMutation.mutate()}
                disabled={!newLeadForm.contactName || !newLeadForm.companyName || !newLeadForm.contactEmail || createLeadMutation.isPending}
                className="px-4 py-2 bg-accent-500 hover:bg-accent-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
              >
                {createLeadMutation.isPending ? "Creating..." : "Create Contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
