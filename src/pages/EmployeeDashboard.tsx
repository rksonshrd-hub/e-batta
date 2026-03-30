import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRef } from 'react';
import Select from "react-select";
import toast from "react-hot-toast";
import { Briefcase, Bed, CalendarX, PartyPopper, CalendarDays, History, User, Layers, BadgeCheck, IndianRupee, UserCheck, Users } from "lucide-react";
import type { Employee, DailyEntry } from '../types';

interface Period {
  id: string;
  month: string;
  period: string;
  start_date: string;
  end_date: string;
}



export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<'self' | 'others'>('self');

  const [work, setWork] = useState('');

  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);

  const [employeeInfo, setEmployeeInfo] = useState<Employee | null>(null);
  const [approverInfo, setApproverInfo] = useState<Employee | null>(null);

  const displayEmployee =
    activeTab === 'self' ? employeeInfo : selectedEmployee;


  const [loading, setLoading] = useState(true);
  const [entryHistory, setEntryHistory] = useState<DailyEntry[]>([]);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const today = new Date().toISOString().split('T')[0];

  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();
  const dateRef = useRef<HTMLInputElement>(null);
  const [dutyType, setDutyType] = useState<'day' | 'night'>('day');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [previousPeriod, setPreviousPeriod] = useState<Period | null>(null);
  const [selectedPeriodTab, setSelectedPeriodTab] = useState<'current' | 'previous'>('current');
  const [entryType, setEntryType] = useState<'work' | 'sunday' | 'rest' | 'leave' | 'holiday'>('work');
  const [dateMode, setDateMode] = useState<'single' | 'multiple'>('single');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const activePeriod =
    selectedPeriodTab === 'current'
      ? currentPeriod
      : previousPeriod;

  const todayDate = new Date().toISOString().split('T')[0];
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔥 LIMIT DATE RANGE
  const minDate = activePeriod?.start_date || '';
  const maxDate =
    selectedPeriodTab === 'current'
      ? todayDate
      : activePeriod?.end_date || '';


  const init = async () => {
    setLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0];

      /* 🔹 USER */
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      /* 🔹 EMPLOYEE */
      const { data: emp } = await supabase
        .from("employees")
        .select("*")
        .eq("auth_user_id", userId)
        .single();

      if (!emp) return;

      setEmployeeInfo(emp);

      /* 🔹 PERIOD */
      const { data: allPeriods } = await supabase
        .from("periods")
        .select("*")
        .order("start_date", { ascending: false });

      let current: Period | null = null;
      let previous: Period | null = null;

      if (allPeriods?.length) {
        const matchedCurrent = allPeriods.find(
          (p) => today >= p.start_date && today <= p.end_date
        );

        current = matchedCurrent || null;

        if (matchedCurrent) {
          previous =
            allPeriods.find(
              (p) =>
                new Date(p.end_date) <
                new Date(matchedCurrent.start_date)
            ) || null;
        }
      }

      setCurrentPeriod(current);
      setPreviousPeriod(previous);

      /* 🔥 HISTORY (FIXED HERE) */
      if (current) {
        const { data: history } = await supabase
          .from("daily_entries")
          .select("*")
          .eq("auth_user_id", userId)
          .eq("month", current.month)
          .eq("period", current.period)
          .order("date", { ascending: false });

        console.log("✅ History:", history);
        setEntryHistory(history || []);
      }

      /* 🔹 APPROVER */
      if (emp.role === "manager") {
        // 🔥 Manager → Auto Approval
        setApproverInfo({
          emp_name: "Auto Approval"
        } as any); // 👈 quick fix type
      } else {
        // 🔥 Employee / HR → fetch approver
        const { data: matrix } = await supabase
          .from("approval_matrix")
          .select("*")
          .eq("grade_code", emp.grade_code)
          .eq("dept", emp.dept) // ✅ important
          .single();

        if (matrix?.manager_id) {
          const { data: approver } = await supabase
            .from("employees")
            .select("*")
            .eq("id", matrix.manager_id)
            .single();

          setApproverInfo(approver || null);
        } else {
          setApproverInfo(null);
        }
      }

      /* 🔹 EMPLOYEE LIST */
      const { data: permissions } = await supabase
        .from("entry_permission")
        .select("allowed_grade")
        .eq("entry_by_grade", emp.grade_code);

      const grades = permissions?.map((p) => p.allowed_grade) || [];

      if (grades.length > 0) {
        const { data: emps } = await supabase
          .from("employees")
          .select("*")
          .in("grade_code", grades)
          .eq("dept", emp.dept) // 🔥 ADD THIS
          .neq("grade_code", emp.grade_code);

        setEmployeeList(emps || []);
      } else {
        setEmployeeList([]);
      }

    } catch (err) {
      console.error("❌ Init error:", err);
    } finally {
      setLoading(false);
    }
  };

  // INITIAL LOAD
  useEffect(() => {
    init();
  }, []);

  // TAB SWITCH FIX
  useEffect(() => {
    const handleFocus = () => {
      console.log("🔄 Refetch on focus");
      init();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    const loadDynamicApprover = async () => {

      const targetEmployee =
        activeTab === "self"
          ? employeeInfo
          : selectedEmployee;

      if (!targetEmployee) return;

      // 🔥 Manager → Auto Approval
      if (employeeInfo?.role === "manager") {
        setApproverInfo({
          emp_name: "Auto Approval"
        } as any);
        return;
      }

      // 🔥 Fetch approver (dept + grade)
      const { data: matrix } = await supabase
        .from("approval_matrix")
        .select("*")
        .eq("grade_code", targetEmployee.grade_code)
        .eq("dept", targetEmployee.dept)
        .single();

      if (!matrix?.manager_id) {
        setApproverInfo(null);
        return;
      }

      const { data: approver } = await supabase
        .from("employees")
        .select("*")
        .eq("id", matrix.manager_id)
        .single();

      setApproverInfo(approver || null);
    };

    loadDynamicApprover();

  }, [selectedEmployee, activeTab, employeeInfo]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };


  const handleSubmit = async () => {
    try {
      if (!selectedDate && dateMode === 'single') {
        alert("Select date ❌");
        return;
      }

      if (entryType === 'work' && !work) {
        alert("Enter work details ❌");
        return;
      }

      // 🔥 CONFIRM
      const confirmSubmit = window.confirm(
        "Are you sure you want to submit your duty?"
      );
      if (!confirmSubmit) return;

      setIsSubmitting(true);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (!emp) {
        alert("Employee not found ❌");
        return;
      }

      const targetEmployee =
        activeTab === 'others'
          ? selectedEmployee
          : emp;

      if (activeTab === 'others' && !selectedEmployee) {
        alert("Please select employee ❌");
        return;
      }

      // 🔥 DATE LIST (UPDATED LOGIC)
      let dates: string[] = [];

      if (dateMode === 'single') {
        dates = [selectedDate];
      } else {

        // ❌ BLOCK ONLY SUNDAY ENTRY TYPE
        if (entryType === 'sunday') {
          alert("Multiple dates cannot be marked as Sunday ❌");
          return;
        }

        let current = new Date(fromDate);
        const end = new Date(toDate);

        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];

          // ✅ NO BLOCK for Sundays inside range
          dates.push(dateStr);

          current.setDate(current.getDate() + 1);
        }
      }

      // 🔥 TIME CONVERT
      const convertTo12Hour = (time: string) => {
        const [h, m] = time.split(":");
        let hour = parseInt(h);
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        return `${hour}:${m} ${ampm}`;
      };

      const dutyTime =
        entryType === 'work' && dutyType === 'night'
          ? `${convertTo12Hour(fromTime)} - ${convertTo12Hour(toTime)}`
          : null;

      // 🔥 APPROVER
      let manager_id = null;
      let manager_name = "Auto Approval";
      let finalStatus = "approved";

      if (emp.role !== "manager") {
        const { data: matrix } = await supabase
          .from('approval_matrix')
          .select('*')
          .eq('grade_code', targetEmployee.grade_code)
          .eq('dept', targetEmployee.dept)
          .single();

        if (!matrix) {
          alert("No approver mapped ❌");
          return;
        }

        const { data: approver } = await supabase
          .from('employees')
          .select('*')
          .eq('id', matrix.manager_id)
          .single();

        manager_id = matrix.manager_id;
        manager_name = approver?.emp_name || "-";

        finalStatus =
          entryType === 'work' ? 'pending' : 'auto-approved';
      }

      const isWork = entryType === 'work';
      const finalBatta = isWork ? targetEmployee.batta_amount : 0;
      let successCount = 0;
      let failCount = 0;
      let errorMessages: string[] = []; // 🔥 NEW

      // 🔥 LOOP INSERT
      for (const date of dates) {

        try {

          const { data: existing } = await supabase
            .from('daily_entries')
            .select('*')
            .eq('emp_code', targetEmployee.emp_code)
            .eq('date', date);

          // 🔥 CHECK EXISTING
          if (existing && existing.length > 0) {

            const hasWork = existing.some(e => e.entry_type === 'work');
            const hasSpecial = existing.some(e =>
              ['leave', 'rest', 'holiday', 'sunday'].includes(e.entry_type)
            );

            // 🔥 CASE 1: If existing is SPECIAL → block everything
            if (hasSpecial) {
              failCount++;
              errorMessages.push(
                `${date} - already marked as ${existing[0].entry_type}`
              );
              continue;
            }

            // 🔥 CASE 2: If new entry is SPECIAL but WORK already exists → block
            if (entryType !== 'work' && hasWork) {
              failCount++;
              errorMessages.push(
                `${date} - already has work entry`
              );
              continue;
            }

            // 🔥 CASE 3: WORK logic
            if (entryType === 'work') {

              const hasSameType = existing.some(
                (e) => e.duty_type === dutyType
              );

              // ❌ Same day/night duplicate
              if (hasSameType) {
                failCount++;
                errorMessages.push(`${date} - ${dutyType} already exists`);
                continue;
              }

              // ❌ Max 2 entries (day + night)
              if (existing.length >= 2) {
                failCount++;
                errorMessages.push(`${date} - already has Day & Night`);
                continue;
              }
            }
          }

          const { data: period } = await supabase
            .from('periods')
            .select('*')
            .lte('start_date', date)
            .gte('end_date', date)
            .single();

          if (!period) {
            failCount++;
            continue;
          }

          const { error } = await supabase
            .from('daily_entries')
            .insert({
              auth_user_id: targetEmployee.auth_user_id,
              emp_name: targetEmployee.emp_name,
              emp_category: targetEmployee.emp_category,
              emp_code: targetEmployee.emp_code,
              dept: targetEmployee.dept,

              entered_by: userId,
              entered_name: emp.emp_name,

              date,
              month: period.month,
              period: period.period,

              work_description: work,

              status: finalStatus,

              manager_id,
              manager_name,

              duty_type: isWork ? dutyType : null,
              duty_time: dutyTime,

              entry_type: entryType,
              batta_amount: finalBatta,
            });

          if (error) {
            failCount++;
          } else {
            successCount++;
          }

        } catch {
          failCount++;
        }
      }


      // 🔥 FINAL RESULT MESSAGE
      if (successCount > 0 && failCount === 0) {
        toast.success(`All ${successCount} entries submitted ✅`);
      }
      else if (successCount > 0 && failCount > 0) {
        toast(`⚠️ ${successCount} success, ${failCount} failed`, {
          icon: "⚠️",
        });

        console.log("❌ Failed Dates:", errorMessages);
      }
      else {
        // 🔥 SHOW EXACT ERRORS
        toast.error(errorMessages.slice(0, 2).join("\n") || "Submission failed ❌");

        console.log("❌ Errors:", errorMessages);
      }

      // 🔥 RESET ONLY IF SUCCESS
      if (successCount > 0) {
        setSelectedDate(today);
        setWork('');
        setSelectedEmployee(null);
      }

    } catch (err) {
      console.error(err);
      alert("Something went wrong ❌");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
  };

  useEffect(() => {
    if (!activePeriod) return;

    if (selectedPeriodTab === 'current') {
      setSelectedDate(todayDate); // ✅ auto today
    } else {
      setSelectedDate(''); // ✅ empty for previous
    }
  }, [selectedPeriodTab, currentPeriod, previousPeriod]);

  useEffect(() => {
    if (dutyType === 'night') {
      setFromTime('18:00'); // 6 PM
      setToTime('06:00');   // 6 AM
    }
  }, [dutyType]);

  const format12Hour = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    let hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">

        {/* 🔹 Background Blur */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-md"></div>

        {/* 🔹 Loader Card */}
        <div className="relative z-10 flex flex-col items-center gap-5 px-8 py-6 rounded-2xl shadow-xl bg-white/70 backdrop-blur-lg border border-white/40">

          {/* 🔥 Windows-style Spinner */}
          <div className="flex gap-2">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></span>
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-gray-800">
            Loading Dashboard
          </h2>

          {/* Subtitle */}
          <p className="text-sm text-gray-500 text-center">
            Fetching employee data...
          </p>

        </div>
      </div>
    );
  }

  const hasNight = entryHistory.some(
    (e) => e.duty_type === 'night'
  );

  return (


    <div className="space-y-6">

      {/* 🔷 Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Daily Duty Entry</h1>
        <p className="text-sm text-gray-500">Submit your work details</p>
      </div>

      {/* 🔷 Employee + Approver Card */}
      {displayEmployee && (
        <div className="bg-white rounded-2xl shadow-md border p-5 transition hover:shadow-lg">

          {/* HEADER */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Employee Details
            </h3>
            <span className="text-xs text-gray-400">Live</span>
          </div>

          {/* GRID */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

            {/* Employee */}
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Employee</p>
                <p className="font-semibold text-sm">{displayEmployee.emp_name}</p>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
              <Layers className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="font-semibold text-sm">{displayEmployee.emp_category}</p>
              </div>
            </div>

            {/* Grade */}
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
              <BadgeCheck className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Grade</p>
                <p className="font-semibold text-sm">{displayEmployee.grade_code}</p>
              </div>
            </div>

            {/* 🔥 BATTA */}
            <div className="flex items-center gap-3 bg-green-50 p-3 rounded-xl">
              <IndianRupee className="w-5 h-5 text-green-700" />
              <div>
                <p className="text-xs text-gray-500">Batta</p>
                <p className="font-semibold text-green-700 text-sm">
                  ₹ {displayEmployee.batta_amount || 0}
                </p>
              </div>
            </div>

            {/* Approver */}
            <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-xl">
              <UserCheck className="w-5 h-5 text-blue-700" />
              <div>
                <p className="text-xs text-gray-500">Approver</p>
                <p className="font-semibold text-blue-700 text-sm">
                  {employeeInfo?.role === "manager"
                    ? "Auto Approval"
                    : approverInfo?.emp_name || "-"
                  }
                </p>
              </div>
            </div>

          </div>

        </div>
      )}


      {(currentPeriod || previousPeriod) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* 🔵 CURRENT */}
          {currentPeriod && (
            <div
              onClick={() => setSelectedPeriodTab('current')}
              className={`cursor-pointer rounded-xl px-4 py-3 border transition-all duration-200
        ${selectedPeriodTab === 'current'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200'
                  : 'bg-white hover:shadow-sm hover:border-blue-300'
                }`}
            >

              {/* 🔷 Title + Icon */}
              <div className="flex items-center justify-center gap-1 mb-1">
                <CalendarDays
                  className={`w-3.5 h-3.5 
            ${selectedPeriodTab === 'current' ? 'text-blue-100' : 'text-gray-500'}`}
                />

                <p
                  className={`text-xs font-medium 
            ${selectedPeriodTab === 'current' ? 'text-blue-100' : 'text-gray-500'}`}
                >
                  Current Period
                </p>
              </div>

              {/* 🔷 Month + Date */}
              <p
                className={`text-sm text-center font-semibold leading-tight
          ${selectedPeriodTab === 'current' ? 'text-white' : 'text-gray-800'}`}
              >
                {currentPeriod.month}
                <span className="mx-1 text-xs opacity-70">•</span>
                {formatDate(currentPeriod.start_date)} - {formatDate(currentPeriod.end_date)}
              </p>

            </div>
          )}

          {/* 🟣 PREVIOUS */}
          {previousPeriod && (
            <div
              onClick={() => setSelectedPeriodTab('previous')}
              className={`cursor-pointer rounded-xl px-4 py-3 border transition-all duration-200
        ${selectedPeriodTab === 'previous'
                  ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-200'
                  : 'bg-white hover:shadow-sm hover:border-purple-300'
                }`}
            >

              {/* 🔷 Title + Icon */}
              <div className="flex items-center justify-center gap-1 mb-1">
                <History
                  className={`w-3.5 h-3.5 
            ${selectedPeriodTab === 'previous' ? 'text-purple-100' : 'text-gray-500'}`}
                />

                <p
                  className={`text-xs font-medium 
            ${selectedPeriodTab === 'previous' ? 'text-purple-100' : 'text-gray-500'}`}
                >
                  Previous Period
                </p>
              </div>

              {/* 🔷 Month + Date */}
              <p
                className={`text-sm text-center font-semibold leading-tight
          ${selectedPeriodTab === 'previous' ? 'text-white' : 'text-gray-800'}`}
              >
                {previousPeriod.month}
                <span className="mx-1 text-xs opacity-70">•</span>
                {formatDate(previousPeriod.start_date)} - {formatDate(previousPeriod.end_date)}
              </p>

            </div>
          )}

        </div>
      )}

      {/* 🔷 Entry Mode Cards */}
      <div className={`flex gap-4 justify-center mt-4`}>

        {/* 🔵 SELF ENTRY */}
        <div
          onClick={() => setActiveTab('self')}
          className={`cursor-pointer flex items-center gap-3 px-5 py-3 rounded-xl border transition-all duration-200
    ${activeTab === 'self'
              ? 'bg-blue-600 text-white shadow-md scale-[1.03]'
              : 'bg-white text-gray-600 hover:shadow-sm'
            }`}
        >
          <User className={`w-4 h-4 ${activeTab === 'self' ? 'text-white' : 'text-gray-500'}`} />
          <span className="text-sm font-medium">Self Entry</span>
        </div>

        {/* 🟣 ENTRY FOR OTHERS (ONLY HR + EMPLOYEE) */}
        {(employeeInfo?.role === 'employee' || employeeInfo?.role === 'hr') && (
          <div
            onClick={() => setActiveTab('others')}
            className={`cursor-pointer flex items-center gap-3 px-5 py-3 rounded-xl border transition-all duration-200
      ${activeTab === 'others'
                ? 'bg-purple-600 text-white shadow-md scale-[1.03]'
                : 'bg-white text-gray-600 hover:shadow-sm'
              }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'others' ? 'text-white' : 'text-gray-500'}`} />
            <span className="text-sm font-medium">Entry for Others</span>
          </div>
        )}

      </div>

      {/* 🔷 Form Card */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">

        <h2 className="font-semibold text-gray-700">Entry Details</h2>

        {/* 🔷 Employee Search Dropdown */}
        {activeTab === 'others' && (
          <div className="space-y-1">
            <label className="text-sm text-gray-600 font-medium">
              Select Employee
            </label>

            <Select
              options={employeeList.map(emp => ({
                value: emp,
                label: emp.emp_name,
              }))}

              onChange={(selected) =>
                setSelectedEmployee(selected?.value || null)
              }

              placeholder="🔍 Search employee..."

              isClearable
              isSearchable

              styles={{
                control: (base, state) => ({
                  ...base,
                  borderRadius: '10px',
                  borderColor: state.isFocused ? '#2563eb' : '#e5e7eb',
                  boxShadow: state.isFocused ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none',
                  padding: '2px',
                }),

                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isFocused
                    ? '#eff6ff'
                    : state.isSelected
                      ? '#2563eb'
                      : 'white',
                  color: state.isSelected ? 'white' : '#374151',
                  cursor: 'pointer',
                }),

                menu: (base) => ({
                  ...base,
                  borderRadius: '10px',
                  overflow: 'hidden',
                }),
              }}

              className="mt-1"
            />
          </div>
        )}

        <div className="bg-white border rounded-2xl p-5 space-y-5 shadow-sm">

          {/* 🔷 MODE SWITCH */}
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setDateMode('single')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition
      ${dateMode === 'single'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-100 text-gray-600'
                }`}
            >
              📅 Single Day
            </button>

            <button
              onClick={() => setDateMode('multiple')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition
      ${dateMode === 'multiple'
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-gray-100 text-gray-600'
                }`}
            >
              📆 Multiple Days
            </button>
          </div>

          {/* 🔷 DATE SECTION */}
          <div className="bg-gradient-to-br from-gray-50 to-white border rounded-xl p-4">

            {/* SINGLE DAY */}
            {dateMode === 'single' && (
              <div className="flex items-center justify-between">

                {/* 🔷 Date Display */}
                <div>
                  <p className="text-xs text-gray-500">
                    {selectedPeriodTab === 'current' ? 'Duty Date' : 'Select Date'}
                  </p>

                  <p
                    onClick={() => dateRef.current?.showPicker()}
                    className={`cursor-pointer text-lg font-semibold
          ${!selectedDate ? 'text-gray-400 italic' : 'text-gray-800'}`}
                  >
                    {selectedDate
                      ? new Date(selectedDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                      : 'Select Date'}
                  </p>

                  {/* Hidden Picker */}
                  <input
                    ref={dateRef}
                    type="date"
                    value={selectedDate || ''}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="absolute opacity-0 pointer-events-none"
                  />
                </div>

                {/* 🔷 Quick Buttons (ONLY CURRENT PERIOD) */}
                {selectedPeriodTab === 'current' && (
                  <div className="flex gap-2">

                    <button
                      onClick={() => setSelectedDate(yesterday)}
                      className={`px-3 py-1 rounded-full text-sm transition
            ${selectedDate === yesterday
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                    >
                      Yesterday
                    </button>

                    <button
                      onClick={() => setSelectedDate(todayDate)}
                      className={`px-3 py-1 rounded-full text-sm transition
            ${selectedDate === todayDate
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                    >
                      Today
                    </button>

                  </div>
                )}

              </div>
            )}

            {/* MULTIPLE DAY */}
            {dateMode === 'multiple' && (
              <div className="grid grid-cols-2 gap-4">

                <div>
                  <p className="text-xs text-gray-500">From Date</p>
                  <input
                    type="date"
                    value={fromDate}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-500">To Date</p>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || minDate} // 🔥 cannot go before fromDate
                    max={maxDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>
            )}

          </div>

          {/* 🔷 DAY / NIGHT */}
          <div className="flex justify-center gap-3">

            <button
              onClick={() => setDutyType('day')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition
      ${dutyType === 'day'
                  ? 'bg-green-600 text-white shadow'
                  : 'bg-gray-200'
                }`}
            >
              🌤 Day
            </button>

            <button
              onClick={() => setDutyType('night')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition
      ${dutyType === 'night'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-gray-200'
                }`}
            >
              🌙 Night
            </button>

          </div>

          {/* 🔥 NIGHT TIME */}
          {dutyType === 'night' && (
            <div className="bg-indigo-50 border rounded-xl p-4 space-y-3">

              <p className="text-sm font-semibold text-indigo-700">
                Night Duty Time
              </p>

              <div className="flex items-center justify-center gap-4">

                <div>
                  <input
                    type="time"
                    step="1800"
                    value={fromTime}
                    onChange={(e) => setFromTime(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-center text-gray-500 mt-1">
                    {format12Hour(fromTime)}
                  </p>
                </div>

                <span className="text-gray-400">→</span>

                <div>
                  <input
                    type="time"
                    step="1800"
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-center text-gray-500 mt-1">
                    {format12Hour(toTime)}
                  </p>
                </div>

              </div>

              <p className="text-xs text-gray-500 text-center">
                Default: 6:00 PM → 6:00 AM
              </p>

            </div>
          )}

        </div>

        {/* 🔷 Entry Type Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

          {[
            {
              key: 'work',
              label: 'Work',
              icon: Briefcase,
              active: 'bg-green-100 border-green-500 text-green-700',
            },
            {
              key: 'sunday',
              label: 'Sunday',
              icon: Bed,
              active: 'bg-gray-200 border-gray-500 text-gray-700',
            },
            {
              key: 'rest',
              label: 'Rest',
              icon: Bed,
              active: 'bg-gray-300 border-gray-600 text-gray-800',
            },
            {
              key: 'leave',
              label: 'Leave',
              icon: CalendarX,
              active: 'bg-yellow-100 border-yellow-500 text-yellow-700',
            },
            {
              key: 'holiday',
              label: 'Holiday',
              icon: PartyPopper,
              active: 'bg-indigo-100 border-indigo-500 text-indigo-700',
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = entryType === item.key;

            return (
              <button
                key={item.key}
                onClick={() => {
                  setEntryType(item.key as any);
                  setWork(item.key === 'work' ? '' : item.label);
                }}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all duration-200
        ${isActive
                    ? `${item.active} shadow-sm scale-[1.02]`
                    : 'bg-white text-gray-600 hover:bg-gray-50 hover:shadow-sm'
                  }`}
              >

                {/* 🔥 Icon */}
                <div
                  className={`p-1.5 rounded-md transition-all duration-300
          ${isActive
                      ? 'bg-white/70 scale-110'
                      : 'bg-gray-100 group-hover:scale-105'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* 🔥 Text */}
                <div className="text-left leading-tight">
                  <p className="text-xs font-semibold">{item.label}</p>
                </div>

              </button>
            );
          })}

        </div>

        {/* 🔷 Work Description */}
        <div className="space-y-2">

          <label className="text-xs text-gray-500 font-medium">
            Work Description
          </label>

          <div className={`relative rounded-xl border transition-all
    ${entryType !== 'work'
              ? 'bg-gray-100 border-gray-200'
              : 'bg-white border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'
            }`}
          >

            {/* 🔥 Icon */}
            <div className="absolute top-3 left-3 text-gray-400">
              ✍️
            </div>

            <textarea
              rows={3}
              value={work}
              onChange={(e) => setWork(e.target.value)}
              placeholder={
                entryType === 'work'
                  ? 'Describe your work...'
                  : 'Auto-filled based on selection'
              }
              disabled={entryType !== 'work'}
              className={`w-full pl-10 pr-3 py-2 bg-transparent outline-none text-sm rounded-xl resize-none
      ${entryType !== 'work'
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-gray-700'
                }`}
            />

          </div>

        </div>

        {/* 🔷 Selected Type */}
        <div className="flex items-center justify-between bg-gray-50 border rounded-lg px-3 py-2">

          <p className="text-xs text-gray-500">Selected Type</p>

          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700 uppercase">
            {entryType}
          </span>

        </div>

        {/* 🔥 SUBMIT BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300
  ${isSubmitting
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.01] hover:shadow-lg'
            }`}
        >

          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">

              {/* 🔥 Spinner */}
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>

              <span className="text-sm">
                Submitting your duty details...
              </span>

            </div>
          ) : (
            "Submit Entry"
          )}

        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5">

        {/* 🔷 HEADER */}
        <h2 className="font-semibold text-gray-700 mb-4">
          My Entries ({currentPeriod?.month})
        </h2>

        {entryHistory.length === 0 ? (
          <p className="text-sm text-gray-500">No entries yet</p>
        ) : (
          <>

            {/* ================= 💻 DESKTOP TABLE ================= */}
            <div className="hidden sm:block overflow-x-auto">
              <div className="min-w-[700px]">

                {(() => {
                  const gridClass = hasNight
                    ? 'grid-cols-[110px_100px_130px_1fr_110px_150px]'
                    : 'grid-cols-[110px_100px_1fr_110px_150px]';

                  return (
                    <>
                      {/* HEADER */}
                      <div className={`grid ${gridClass} gap-4 text-xs font-semibold text-gray-500 border-b pb-2 mb-2`}>
                        <div>Date</div>
                        <div>Type</div>
                        {hasNight && <div>Time</div>}
                        <div>Work</div>
                        <div className="text-right">Batta</div>
                        <div className="text-right pr-2">Status</div>
                      </div>

                      {/* ROWS */}
                      <div className="space-y-2">
                        {entryHistory.map((entry) => {
                          const isNight = entry.duty_type === 'night';

                          const typeLabel = entry.duty_type || entry.entry_type;

                          const typeColor =
                            entry.entry_type === 'leave'
                              ? 'bg-yellow-100 text-yellow-700'
                              : entry.entry_type === 'holiday'
                                ? 'bg-indigo-100 text-indigo-700'
                                : entry.entry_type === 'sunday'
                                  ? 'bg-gray-200 text-gray-700'
                                  : isNight
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-green-100 text-green-700';

                          return (
                            <div
                              key={entry.id}
                              className={`grid ${gridClass} gap-4 items-center py-2 px-3 rounded-lg hover:bg-gray-50 transition`}
                            >

                              <div className="text-sm text-gray-700 whitespace-nowrap">
                                {formatDate(entry.date)}
                              </div>

                              <div className="text-xs font-medium">
                                <span className={`px-2 py-1 rounded-full whitespace-nowrap ${typeColor}`}>
                                  {typeLabel?.toUpperCase()}
                                </span>
                              </div>

                              {hasNight && (
                                <div className="text-sm text-gray-600 whitespace-nowrap">
                                  {isNight ? entry.duty_time : '-'}
                                </div>
                              )}

                              <div className="text-sm text-gray-600 truncate">
                                {entry.work_description}
                              </div>

                              <div className="text-sm text-right font-semibold text-gray-700 whitespace-nowrap">
                                ₹ {entry.batta_amount || 0}
                              </div>

                              <div className="flex justify-end pr-2">
                                <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${getStatusColor(entry.status)}`}>
                                  {entry.status.toUpperCase()}
                                </span>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}

              </div>
            </div>

            {/* ================= 📱 MOBILE CARDS ================= */}
            <div className="sm:hidden space-y-3">

              {entryHistory.map((entry) => {
                const isNight = entry.duty_type === 'night';

                return (
                  <div
                    key={entry.id}
                    className="bg-gray-50 border rounded-xl p-4 shadow-sm hover:shadow-md transition"
                  >

                    {/* Top row */}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {formatDate(entry.date)}
                      </span>

                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(entry.status)}`}>
                        {entry.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Type + Time */}
                    <div className="text-xs text-gray-500 mb-2">
                      {entry.duty_type?.toUpperCase()}
                      {isNight && ` (${entry.duty_time})`}
                    </div>

                    {/* Work */}
                    <div className="text-sm text-gray-700 mb-3">
                      {entry.work_description}
                    </div>

                    {/* Bottom */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Batta</span>
                      <span className="font-semibold text-gray-800">
                        ₹ {entry.batta_amount || 0}
                      </span>
                    </div>

                  </div>
                );
              })}

            </div>

          </>
        )}

      </div>
    </div>
  );
}