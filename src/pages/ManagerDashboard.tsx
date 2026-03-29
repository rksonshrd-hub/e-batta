import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { DailyEntry } from '../types';
import { Check, X, Trash2, Search } from "lucide-react";

// Entry is now DailyEntry from types

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [groupedEntries, setGroupedEntries] = useState<{ [key: string]: { [key: string]: DailyEntry[] } }>({});
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [editedBatta, setEditedBatta] = useState<{ [key: string]: number }>({});
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const loadEntries = async () => {
    try {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // 🔥 Manager details
      const { data: manager, error: managerError } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (managerError || !manager) {
        console.error("❌ Manager fetch error:", managerError);
        return;
      }

      // 🔥 Entries
      const { data, error } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('manager_id', manager.id)
        .eq('status', 'pending')
        .order('date', { ascending: true });

      if (error) {
        console.error("❌ Entry fetch error:", error);
        return;
      }

      const entriesData = (data || []) as DailyEntry[];

      // 🔥 GROUP DATA (IMPORTANT)
      const grouped = groupEntries(entriesData);
      setGroupedEntries(grouped);

    } catch (err) {
      console.error("❌ Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const groupEntries = (entries: DailyEntry[]) => {
    const grouped: { [key: string]: { [key: string]: DailyEntry[] } } = {};

    entries.forEach(entry => {
      const periodKey = `${entry.month} (${entry.period})`;

      if (!grouped[periodKey]) {
        grouped[periodKey] = {};
      }

      if (!grouped[periodKey][entry.emp_name]) {
        grouped[periodKey][entry.emp_name] = [];
      }

      grouped[periodKey][entry.emp_name].push(entry);
    });

    return grouped;
  };

  const handleBattaChange = (id: string, value: number) => {
    setEditedBatta(prev => ({
      ...prev,
      [id]: value
    }));
  };
  // 🔥 Approve
  const handleApprove = async (entry: DailyEntry) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const finalBatta =
      editedBatta[entry.id] ?? entry.batta_amount;

    await supabase
      .from('daily_entries')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        batta_amount: finalBatta // 🔥 UPDATED VALUE
      })
      .eq('id', entry.id);

    loadEntries();
  };

  const handleApproveAll = async (entries: DailyEntry[]) => {
    try {
      for (const entry of entries) {
        const updatedBatta =
          editedBatta[entry.id] ?? entry.batta_amount;

        await supabase
          .from('daily_entries')
          .update({
            status: 'approved',
            batta_amount: updatedBatta
          })
          .eq('id', entry.id);
      }

      alert("All entries approved ✅");

      // 🔄 reload data
      loadEntries(); // or your refresh function

    } catch (err) {
      console.error(err);
      alert("Error approving all ❌");
    }
  };

  // 🔥 Reject
  const handleReject = async (id: string) => {
    const reason = prompt("Enter reject reason");

    if (!reason) return;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    await supabase
      .from('daily_entries')
      .update({
        status: 'rejected',
        remarks: reason,
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', id);

    loadEntries();
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("Delete this entry?");

    if (!confirmDelete) return;

    await supabase
      .from("daily_entries")
      .delete()
      .eq("id", id);

    loadEntries();
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });



  return (
    <div className="space-y-6">


      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

        {/* 🔷 LEFT → TITLE */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📋 Team Approvals
          </h1>
          <p className="text-sm text-gray-500">
            Review and approve employee entries
          </p>
        </div>

        {/* 🔷 RIGHT → SEARCH + FILTER */}
        <div className="flex gap-3 items-center">

          {/* 🔍 SEARCH */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />

            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border rounded-lg w-52 focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* 🔽 FILTER (future ready) */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="day">Day</option>
            <option value="night">Night</option>
            <option value="leave">Leave</option>
            <option value="rest">Rest</option>
          </select>

        </div>

      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">

          <div className="absolute inset-0 bg-white/40 backdrop-blur-md"></div>

          <div className="relative z-10 flex flex-col items-center gap-5 px-8 py-6 rounded-2xl shadow-xl bg-white/80 backdrop-blur-lg border">

            <div className="flex gap-2">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce"></span>
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce delay-150"></span>
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce delay-300"></span>
            </div>

            <h2 className="text-lg font-semibold text-gray-800">
              Loading Dashboard
            </h2>

            <p className="text-sm text-gray-500">
              Fetching entry data...
            </p>

          </div>
        </div>
      )}


      {!loading && Object.keys(groupedEntries).length === 0 && (
        <div className="text-center py-16 text-gray-400">

          <p className="text-3xl mb-2">🎉</p>

          <p className="text-lg font-medium">
            No pending approvals
          </p>

          <p className="text-sm">
            You're all caught up!
          </p>

        </div>
      )}

      {/* 🔥 GROUPED UI */}
      {!loading && Object.keys(groupedEntries).map(period => (

        <div key={period} className="bg-white border rounded-2xl p-5 shadow-md">

          {/* 🔷 PERIOD HEADER */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-blue-700">
              {period}
            </h2>

            <span className="text-xs text-gray-400">
              Pending Approvals
            </span>
          </div>

          <div className="space-y-3">

            {Object.keys(groupedEntries[period]).map(empName => {

              const empEntries = groupedEntries[period][empName];
              const key = `${period}-${empName}`;

              return (
                <div key={key} className="border rounded-xl overflow-hidden">

                  {/* 🔷 HEADER */}
                  <div
                    onClick={() =>
                      setExpandedEmployee(
                        expandedEmployee === key ? null : key
                      )
                    }
                    className="flex justify-between items-center px-4 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {empName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {empEntries.length} entries
                      </p>
                    </div>

                    <span className="text-sm text-blue-600 font-medium">
                      {expandedEmployee === key ? 'Hide ▲' : 'View ▼'}
                    </span>
                  </div>

                  {/* 🔷 EXPAND */}
                  {expandedEmployee === key && (
                    <div className="border-t p-4 bg-white">

                      {/* 🔥 TOP BAR */}
                      <div className="flex justify-between items-center mb-4">

                        <h3 className="text-sm font-semibold text-gray-700">
                          Entries
                        </h3>

                        <button
                          onClick={() => handleApproveAll(empEntries)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition"
                        >
                          ✔ Approve All
                        </button>

                      </div>

                      {/* 🔷 TABLE HEADER */}
                      <div className="grid grid-cols-[100px_100px_1fr_90px_140px_120px] gap-3 text-xs font-semibold text-gray-500 border-b pb-2 mb-2">
                        <div>Date</div>
                        <div>Type</div>
                        <div>Work</div>
                        <div>Batta</div>
                        <div>Entered By</div>
                        <div className="text-right">Action</div>
                      </div>

                      {/* 🔷 ROWS */}
                      <div className="space-y-2">

                        {empEntries.map((entry: DailyEntry) => (
                          <div
                            key={entry.id}
                            className="grid grid-cols-[100px_100px_1fr_90px_140px_120px] gap-3 items-center bg-gray-50 hover:bg-gray-100 p-3 rounded-xl transition"
                          >

                            {/* Date */}
                            <div className="text-sm text-gray-700">
                              {formatDate(entry.date)}
                            </div>

                            {/* 🔥 Type + Time */}
                            <div>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full
                          ${entry.duty_type === 'night'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-green-100 text-green-700'
                                }`}>
                                {entry.duty_type?.toUpperCase()}
                              </span>

                              {entry.duty_type === "night" && (
                                <p className="text-[10px] text-gray-500 mt-1">
                                  {entry.duty_time}
                                </p>
                              )}
                            </div>

                            {/* Work */}
                            <div className="text-sm text-gray-600 truncate">
                              {entry.work_description}
                            </div>

                            {/* Batta */}
                            <div>
                              <input
                                type="number"
                                value={editedBatta[entry.id] ?? entry.batta_amount}
                                onChange={(e) =>
                                  handleBattaChange(entry.id, Number(e.target.value))
                                }
                                className="w-20 px-2 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Entered By */}
                            <div className="text-sm text-gray-500">
                              {entry.entered_name}
                            </div>

                            {/* 🔥 ACTIONS */}
                            <div className="flex justify-end gap-2">

                              {/* Approve */}
                              <button
                                onClick={() => handleApprove(entry)}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                              >
                                <Check className="w-4 h-4" />
                              </button>

                              {/* Reject */}
                              <button
                                onClick={() => handleReject(entry.id)}
                                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                              >
                                <X className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                            </div>

                          </div>
                        ))}

                      </div>

                    </div>
                  )}

                </div>
              );
            })}

          </div>

        </div>
      ))}

    </div>
  );
}  