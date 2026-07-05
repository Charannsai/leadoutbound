"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  FolderHeart,
  Plus,
  BookMarked,
  Trash2,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  FolderPlus,
  Compass,
  ArrowRight,
  Clock,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ListsPage() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<"lists" | "searches">("lists");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [listName, setListName] = useState("");
  const [listDesc, setListDesc] = useState("");

  // Fetch Custom Lists
  const { data: lists = [], isLoading: listsLoading } = useQuery<any[]>({
    queryKey: ["custom-lists-page"],
    queryFn: async () => {
      const res = await fetch("/api/lists");
      if (!res.ok) throw new Error("Failed to fetch lists");
      return res.json();
    }
  });

  // Fetch Saved Searches
  const { data: savedSearches = [], isLoading: searchesLoading } = useQuery<any[]>({
    queryKey: ["saved-searches-page"],
    queryFn: async () => {
      const res = await fetch("/api/saved-searches");
      if (!res.ok) throw new Error("Failed to fetch saved searches");
      return res.json();
    }
  });

  // Create list mutation
  const createListMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Create list failed");
      return res.json();
    },
    onSuccess: () => {
      setShowCreateModal(false);
      setListName("");
      setListDesc("");
      queryClient.invalidateQueries({ queryKey: ["custom-lists-page"] });
      alert("Custom list folder created successfully!");
    }
  });

  // Delete list mutation
  const deleteListMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/lists?id=${id}`, { method: "DELETE" }); // lists DELETE handler support
      if (!res.ok) throw new Error("Failed to delete list");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-lists-page"] });
    }
  });

  // Delete saved search mutation
  const deleteSearchMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete search");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches-page"] });
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName.trim()) return;
    createListMutation.mutate({ name: listName, description: listDesc });
  };

  return (
    <div className="space-y-6">
      {/* Header and top triggers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Lists & Folders Cockpit</h1>
          <p className="text-xs text-text-secondary">Organize contacts and companies into custom folders or load your saved filter segments.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            New List Folder
          </button>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex items-center gap-1 border-b border-border bg-surface p-1 rounded-xl shadow-sm h-11 shrink-0">
        <button
          onClick={() => setActiveSubTab("lists")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
            activeSubTab === "lists" ? "bg-accent-500 text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
          )}
        >
          <FolderHeart className="w-3.5 h-3.5" />
          Custom Lead Folders ({lists.length})
        </button>
        <button
          onClick={() => setActiveSubTab("searches")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
            activeSubTab === "searches" ? "bg-accent-500 text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
          )}
        >
          <BookMarked className="w-3.5 h-3.5" />
          Saved Filter Searches ({savedSearches.length})
        </button>
      </div>

      {/* Database Display Panel */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-sm min-h-[300px]">
        {activeSubTab === "lists" ? (
          listsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-surface-tertiary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : lists.length === 0 ? (
            <div className="text-center py-20">
              <FolderHeart className="w-12 h-12 text-text-tertiary/20 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-text-primary">No lists created yet</h3>
              <p className="text-xs text-text-tertiary max-w-sm mx-auto mt-1.5">Create a list using the New List button, or select leads on the search page and map them directly into a list.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists.map((list) => (
                <div key={list.id} className="border border-border rounded-xl p-4 bg-surface hover:border-accent-500/30 transition-all flex flex-col justify-between h-36">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-text-primary truncate">{list.name}</span>
                      <span className="px-2 py-0.5 bg-accent-500/10 text-accent-500 text-[10px] font-bold rounded-full">{list._count?.leads || 0} contacts</span>
                    </div>
                    <p className="text-[10px] text-text-secondary line-clamp-2 mt-1.5 leading-relaxed">{list.description || "Folder created for target lead tracking."}</p>
                    <div className="text-[9px] text-text-tertiary mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created {new Date(list.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40 mt-2">
                    <Link
                      href={`/search?listId=${list.id}`}
                      className="flex-1 py-1.5 bg-accent-500/10 hover:bg-accent-500 text-accent-500 hover:text-white text-[10px] font-bold rounded-lg text-center transition-all border border-accent-500/10"
                    >
                      Browse Leads
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm("Delete this list folder? All contacts will remain in database but list relation will be unlinked.")) {
                          deleteListMutation.mutate(list.id);
                        }
                      }}
                      className="p-1.5 hover:bg-danger-500/10 text-text-tertiary hover:text-danger-600 border border-border hover:border-danger-500/20 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          searchesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-surface-tertiary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : savedSearches.length === 0 ? (
            <div className="text-center py-20">
              <BookMarked className="w-12 h-12 text-text-tertiary/20 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-text-primary">No saved searches</h3>
              <p className="text-xs text-text-tertiary max-w-sm mx-auto mt-1.5">Save your search filters on the People Search page to store quick filter configurations.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedSearches.map((s) => {
                const filters = JSON.parse(s.filters);
                return (
                  <div key={s.id} className="border border-border rounded-xl p-4 bg-surface hover:border-accent-500/30 transition-all flex flex-col justify-between h-36">
                    <div>
                      <h4 className="font-bold text-xs text-text-primary truncate">{s.name}</h4>
                      <p className="text-[10px] text-text-tertiary mt-0.5">Created on {new Date(s.createdAt).toLocaleDateString()}</p>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {filters.keyword && <span className="px-1.5 py-0.5 bg-surface-secondary border border-border text-[8px] font-medium rounded text-text-secondary">Key: {filters.keyword}</span>}
                        {filters.location && <span className="px-1.5 py-0.5 bg-surface-secondary border border-border text-[8px] font-medium rounded text-text-secondary">Loc: {filters.location}</span>}
                        {filters.industry && <span className="px-1.5 py-0.5 bg-surface-secondary border border-border text-[8px] font-medium rounded text-text-secondary">Ind: {filters.industry}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-border/40 mt-2">
                      <Link
                        href={`/search?search=${encodeURIComponent(filters.keyword || "")}&location=${encodeURIComponent(filters.location || "")}&industry=${encodeURIComponent(filters.industry || "")}`}
                        className="flex-1 py-1.5 bg-accent-500/10 hover:bg-accent-500 text-accent-500 hover:text-white text-[10px] font-bold rounded-lg text-center transition-all border border-accent-500/10"
                      >
                        Apply Filters
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("Delete this saved search config?")) {
                            deleteSearchMutation.mutate(s.id);
                          }
                        }}
                        className="p-1.5 hover:bg-danger-500/10 text-text-tertiary hover:text-danger-600 border border-border hover:border-danger-500/20 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-surface border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-sm font-bold text-text-primary">Create Lead Folder List</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-text-tertiary hover:text-text-primary rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary">List Folder Name*</label>
                <input
                  type="text"
                  placeholder="e.g. SF SaaS Executives"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  className="w-full bg-surface-secondary px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary">List Description</label>
                <textarea
                  placeholder="Notes about contacts in this folder..."
                  value={listDesc}
                  onChange={(e) => setListDesc(e.target.value)}
                  className="w-full bg-surface-secondary px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border hover:bg-surface-secondary text-text-secondary font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!listName.trim() || createListMutation.isPending}
                  className="px-4 py-2 bg-accent-500 hover:bg-accent-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
                >
                  {createListMutation.isPending ? "Creating..." : "Create List"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
