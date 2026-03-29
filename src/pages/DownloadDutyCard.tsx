import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../context/AuthContext";
import type { Employee, DailyEntry } from "../types";
import { User, Users, Download, Eye } from "lucide-react";

declare module "jspdf" {
    interface jsPDF {
        lastAutoTable: any;
    }
}
/* 🔷 TYPES (using centralized types) */

export default function DownloadDutyCard() {
    const { employeeData } = useAuth(); // Already typed as Employee | null

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const [months, setMonths] = useState<string[]>([]);
    const [periods, setPeriods] = useState<string[]>([]);

    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedPeriod, setSelectedPeriod] = useState("");

    const [entries, setEntries] = useState<DailyEntry[]>([]);
    const [tab, setTab] = useState<"self" | "others">("self");
    const [empSearch, setEmpSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);

    const filteredEmployees = employees.filter(emp =>
        emp.emp_name.toLowerCase().includes(empSearch.toLowerCase())
    );
    /* ---------------- FORMAT DATE ---------------- */
    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString("en-GB");

    /* ---------------- INIT ---------------- */
    useEffect(() => {
        if (!employeeData) return;
        loadEmployees();
        loadMonths();
    }, [employeeData]);

    /* ---------------- LOAD EMPLOYEES ---------------- */
    const loadEmployees = async () => {
        if (!employeeData || employeeData.role === "employee") return;

        // 🔥 Get approval matrix for manager/HR
        const { data: matrix } = await supabase
            .from("approval_matrix")
            .select("grade_code, dept")
            .eq("manager_id", employeeData.id);

        if (!matrix || matrix.length === 0) {
            setEmployees([]);
            return;
        }

        const grades = matrix.map((m) => m.grade_code);

        // 🔥 Fetch employees based on grade + dept
        const { data: emps } = await supabase
            .from("employees")
            .select("*")
            .in("grade_code", grades)
            .eq("dept", employeeData.dept);

        setEmployees((emps as Employee[]) || []);
    };

    /* ---------------- LOAD MONTHS ---------------- */
    const loadMonths = async () => {
        const { data } = await supabase
            .from("daily_entries")
            .select("month")
            .order("month");

        const unique = [...new Set(data?.map((d: any) => d.month))];
        setMonths(unique as string[]);
    };

    /* ---------------- LOAD PERIODS ---------------- */
    useEffect(() => {
        if (!selectedMonth) return;

        const loadPeriods = async () => {
            const { data } = await supabase
                .from("periods")
                .select("period")
                .eq("month", selectedMonth);

            setPeriods(data?.map((p: any) => p.period) || []);
        };

        loadPeriods();
    }, [selectedMonth]);



    /* ---------------- VIEW ---------------- */
    const handleView = async () => {
        if (!employeeData) return;

        // 🔥 VALIDATION
        if (!selectedMonth || !selectedPeriod) {
            alert("Select month & period ❌");
            return;
        }

        // 🔥 TARGET EMPLOYEE
        let targetEmpCode = employeeData.emp_code;

        if (tab === "others") {
            if (!selectedEmployee) {
                alert("Select employee ❌");
                return;
            }

            targetEmpCode = selectedEmployee.emp_code;
        }

        console.log("🔍 Fetching for:", targetEmpCode);

        // 🔥 FETCH DATA (EMP CODE BASED)
        const { data, error } = await supabase
            .from("daily_entries")
            .select("*")
            .eq("emp_code", targetEmpCode)
            .eq("month", selectedMonth)
            .eq("period", selectedPeriod)
            .order("date", { ascending: true });

        if (error) {
            console.error(error);
            alert("Error fetching data ❌");
            return;
        }

        if (!data || data.length === 0) {
            alert(`No data found for ${targetEmpCode} ❌`);
            setEntries([]);
            return;
        }

        console.log("✅ Entries:", data);

        setEntries(data as DailyEntry[]);
    };

    /* ---------------- VALIDATION ---------------- */
    const canDownload = () => {
        if (entries.length === 0) return false;

        const allApproved = entries.every(
            (e) => e.status === "approved" || e.status === "auto-approved"
        );

        if (!allApproved) {
            alert("All entries must be approved ❌");
            return false;
        }

        return true;
    };

    /* ---------------- APPROVAL TEXT ---------------- */
    const formatApproval = (e: any) => {

        // 🔥 OTHERS TAB → no manager name
        if (tab === "others") {
            if (e.status === "approved" || e.status === "auto-approved") {
                return "Approved";
            }
        }

        if (e.status === "auto-approved") return "Auto Approval";
        if (e.status === "approved") return e.manager_name;
        if (e.status === "rejected") return "Rejected";

        return "Pending";
    };

    const sortedEntries = [...entries].sort((a, b) => {
        if (a.date === b.date) {
            if (a.duty_type === "day") return -1;
            if (a.duty_type === "night") return 1;
        }
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    const tableData = sortedEntries.map((e) => [
        formatDate(e.date),

        e.duty_type === "night"
            ? `NIGHT (${e.duty_time || ""})`
            : (e.duty_type || e.entry_type)?.toUpperCase(),

        e.work_description,
        e.batta_amount,
        formatApproval(e),
    ]);

    const total = sortedEntries.reduce(
        (sum, e) => sum + (e.batta_amount || 0),
        0
    );

    // 🔥 ADD TOTAL ROW
    tableData.push([
        "",
        "",
        "TOTAL",
        total,
        ""
    ]);


    /* ---------------- PDF ---------------- */
    const handleDownload = () => {
        if (!canDownload()) {
            alert("Pending approvals exist ❌");
            return;
        }

        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.getWidth();

        const empName =
            employeeData?.role === "employee"
                ? employeeData.emp_name
                : selectedEmployee?.emp_name;

        const empCode =
            employeeData?.role === "employee"
                ? (employeeData as any).emp_code
                : (selectedEmployee as any)?.emp_code;

        const dept =
            employeeData?.role === "employee"
                ? (employeeData as any).dept
                : (selectedEmployee as any)?.dept;

        const category =
            employeeData?.role === "employee"
                ? (employeeData as any).emp_category
                : (selectedEmployee as any)?.emp_category;

        /* ---------------- HEADER ---------------- */

        doc.setFont("times", "bold");
        doc.setFontSize(18);
        doc.text("R K & SONS", pageWidth / 2, 12, { align: "center" });

        doc.setFontSize(13);
        doc.text("E-Batta Card", pageWidth / 2, 20, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        doc.text(
            `${selectedMonth} (${selectedPeriod})`,
            pageWidth / 2,
            26,
            { align: "center" }
        );

        // 🔥 FULL DATE RANGE (IMPORTANT)
        doc.text(
            `${formatDate(entries[0]?.date)} to ${formatDate(entries[entries.length - 1]?.date)}`,
            pageWidth / 2,
            32,
            { align: "center" }
        );
        /* ---------------- EMPLOYEE DETAILS ---------------- */

        doc.setFontSize(9);

        doc.text(`Name : ${empName}`, 14, 42);
        doc.text(`Emp Code : ${empCode}`, 120, 42);

        doc.text(`Designation : ${category}`, 14, 48);
        doc.text(`Site : ${dept}`, 120, 48);

        /* ---------------- TABLE ---------------- */

        /* ---------------- SORT ---------------- */
        const sortedEntries = [...entries].sort((a, b) => {
            if (a.date === b.date) {
                if (a.duty_type === "day") return -1;
                if (a.duty_type === "night") return 1;
            }
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        /* ---------------- APPROVAL ---------------- */
        const formatApproval = (e: any) => {
            if (e.status === "auto-approved") return "Auto Approval";
            if (e.status === "approved") return e.manager_name;
            return "";
        };

        /* ---------------- TABLE DATA ---------------- */
        const tableData = sortedEntries.map((e) => {
            let dutyDisplay = "-";

            if (e.duty_type === "day") {
                dutyDisplay = "DAY";
            }

            if (e.duty_type === "night") {
                dutyDisplay = `NIGHT\n(${e.duty_time || ""})`; // 🔥 next line
            }

            return [
                formatDate(e.date),
                dutyDisplay,
                e.work_description,
                e.batta_amount,
                formatApproval(e),
            ];
        });

        /* ---------------- TOTAL ---------------- */
        const total = sortedEntries.reduce(
            (sum, e) => sum + (e.batta_amount || 0),
            0
        );

        /* 🔥 ADD TOTAL ROW INSIDE TABLE */
        tableData.push([
            "",            // Date
            "",            // Duty
            "TOTAL",       // Work column
            total,         // Batta column
            ""             // Approval
        ]);

        /* ---------------- AUTOTABLE ---------------- */
        autoTable(doc, {
            startY: 55,
            theme: "grid",
            head: [["Date", "Duty Type", "Work Description", "Batta Amount", "Approved By"]],
            body: tableData,

            // 🔥 APPLY TO ALL CELLS
            styles: {
                fontSize: 8,
                valign: "middle",
                cellPadding: 2,
                lineColor: [0, 0, 0], // BLACK
                lineWidth: 0.25,
            },

            // 🔥 HEADER
            headStyles: {
                fillColor: [230, 230, 230],
                textColor: 0,
                fontStyle: "bold",
                lineColor: [0, 0, 0],
                lineWidth: 0.25,
            },

            // 🔥 BODY (IMPORTANT)
            bodyStyles: {
                textColor: 0,
                lineColor: [0, 0, 0],
                lineWidth: 0.25,
            },

            // 🔥 FOOTER (TOTAL ROW)
            footStyles: {
                lineColor: [0, 0, 0],
                lineWidth: 0.25,
            },

            columnStyles: {
                1: { cellWidth: 25 },
                2: { halign: "left" },
                3: { halign: "right" },
            },

            didParseCell: function (data) {

                // 🔥 TOTAL ROW STYLE
                if (data.row.index === tableData.length - 1) {
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.textColor = [0, 0, 0];
                    data.cell.styles.fillColor = [230, 230, 230];
                    data.cell.styles.lineWidth = 0.25;
                }

                // 🔥 NIGHT SMALL TEXT
                if (
                    data.column.index === 1 &&
                    typeof data.cell.raw === "string" &&
                    data.cell.raw.includes("NIGHT")
                ) {
                    data.cell.styles.fontSize = 5;
                }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 60;


        /* ---------------- SUMMARY ---------------- */

        const dayEntries = entries.filter(e => e.duty_type === "day");
        const nightEntries = entries.filter(e => e.duty_type === "night");

        const dayCount = dayEntries.length;
        const nightCount = nightEntries.length;

        const dayTotal = dayEntries.reduce((sum, e) => sum + (e.batta_amount || 0), 0);
        const nightTotal = nightEntries.reduce((sum, e) => sum + (e.batta_amount || 0), 0);

        // 🔥 GRAND TOTAL
        const totalCount = dayCount + nightCount;
        const totalAmount = dayTotal + nightTotal;

        // 🔥 HEADING
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Final Summary", pageWidth / 2, finalY + 18, { align: "center" });

        // 🔥 TABLE
        const summaryBody = [
            ["No. of Day Duty", dayCount, dayTotal],
            ["No. of Night Duty", nightCount, nightTotal],
            ["TOTAL", totalCount, totalAmount], // ✅ NEW ROW
        ];

        autoTable(doc, {
            startY: finalY + 22,

            head: [["Type", "Count", "Amount"]],
            body: summaryBody,

            styles: {
                fontSize: 9,
                halign: "center",
                lineColor: [0, 0, 0],
                lineWidth: 0.25,
            },

            headStyles: {
                fillColor: [230, 230, 230],
                textColor: 0,
                fontStyle: "bold",
            },

            // 🔥 BODY (IMPORTANT)
            bodyStyles: {
                textColor: 0,
                lineColor: [0, 0, 0],
                lineWidth: 0.25,
            },

            columnStyles: {
                0: { halign: "left" },
                2: { halign: "right" },
            },

            tableWidth: 80,
            margin: { left: (pageWidth - 80) / 2 },

            didParseCell: function (data) {
                // 🔥 STYLE TOTAL ROW
                if (data.row.index === summaryBody.length - 1) {
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.fillColor = [240, 240, 240];
                    data.cell.styles.textColor = [0, 0, 0];
                    data.cell.styles.lineWidth = 0.25;
                }
            }
        });
        /* ---------------- FOOTER ---------------- */

        doc.setFontSize(8);
        doc.setTextColor(150);

        doc.text(
            "Generated from RK & SONS E-Batta System",
            pageWidth / 2,
            290,
            { align: "center" }
        );

        /* ---------------- SAVE ---------------- */

        doc.save(`${empName}_DutyCard.pdf`);
    };



    if (!employeeData) return null;

    return (
        <div className="space-y-5">

            {/* 🔷 TITLE */}
            <h1 className="text-xl font-semibold text-gray-800">
                Download Duty Card
            </h1>

            {/* 🔷 TABS */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">

                <button
                    onClick={() => setTab("self")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition
          ${tab === "self"
                            ? "bg-white shadow text-blue-600"
                            : "text-gray-500"
                        }`}
                >
                    <User className="inline w-4 h-4 mr-1" />
                    My Duty Card
                </button>

                {employeeData.role !== "employee" && (
                    <button
                        onClick={() => setTab("others")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition
            ${tab === "others"
                                ? "bg-white shadow text-blue-600"
                                : "text-gray-500"
                            }`}
                    >
                        <Users className="inline w-4 h-4 mr-1" />
                        Others Duty Card
                    </button>
                )}

            </div>

            {/* 🔷 FILTER CARD */}
            <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">



                {tab === "others" && (
                    <div className="relative">

                        {/* INPUT */}
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={empSearch}
                            onFocus={() => setShowDropdown(true)}
                            onChange={(e) => {
                                setEmpSearch(e.target.value);
                                setShowDropdown(true);
                                setHighlightIndex(0);
                            }}
                            onKeyDown={(e) => {
                                if (!filteredEmployees.length) return;

                                if (e.key === "ArrowDown") {
                                    setHighlightIndex(prev =>
                                        prev < filteredEmployees.length - 1 ? prev + 1 : prev
                                    );
                                }

                                if (e.key === "ArrowUp") {
                                    setHighlightIndex(prev =>
                                        prev > 0 ? prev - 1 : 0
                                    );
                                }

                                if (e.key === "Enter") {
                                    const emp = filteredEmployees[highlightIndex];
                                    if (emp) {
                                        setSelectedEmployee(emp);
                                        setEmpSearch(emp.emp_name);
                                        setShowDropdown(false);
                                    }
                                }
                            }}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />

                        {/* DROPDOWN */}
                        {showDropdown && empSearch && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg max-h-52 overflow-y-auto shadow-lg">

                                {filteredEmployees.map((emp, index) => (
                                    <div
                                        key={emp.id}
                                        onClick={() => {
                                            setSelectedEmployee(emp);
                                            setEmpSearch(emp.emp_name);
                                            setShowDropdown(false);
                                        }}
                                        className={`px-3 py-2 cursor-pointer text-sm
              ${index === highlightIndex
                                                ? "bg-blue-100"
                                                : "hover:bg-blue-50"
                                            }`}
                                    >
                                        {emp.emp_name}
                                    </div>
                                ))}

                                {filteredEmployees.length === 0 && (
                                    <div className="px-3 py-2 text-gray-400 text-sm">
                                        No employee found
                                    </div>
                                )}

                            </div>
                        )}

                    </div>
                )}

                {/* Month */}
                <select
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                >
                    <option>Select Month</option>
                    {months.map(m => (
                        <option key={m}>{m}</option>
                    ))}
                </select>

                {/* Period */}
                <select
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                >
                    <option>Select Period</option>
                    {periods.map(p => (
                        <option key={p}>{p}</option>
                    ))}
                </select>

                {/* VIEW BUTTON */}
                <button
                    onClick={handleView}
                    className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Eye className="w-4 h-4" />
                    View Duty Card
                </button>

            </div>

            {/* 🔷 TABLE */}
            {entries.length > 0 && (
                <div className="bg-white border rounded-xl p-4 shadow-sm">

                    {/* HEADER */}
                    <div className="grid grid-cols-[100px_120px_1fr_100px_120px] gap-3 text-xs font-semibold text-gray-500 border-b pb-2 mb-2">
                        <div>Date</div>
                        <div>Duty</div>
                        <div>Work</div>
                        <div>Batta</div>
                        <div>Status</div>
                    </div>

                    {/* ROWS */}
                    <div className="space-y-2">

                        {entries.map(e => (
                            <div
                                key={e.id}
                                className="grid grid-cols-[100px_120px_1fr_100px_120px] gap-3 items-center bg-gray-50 p-2 rounded-lg"
                            >

                                <div>{formatDate(e.date)}</div>

                                {/* 🔥 DUTY */}
                                <div>
                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                        {e.duty_type || e.entry_type}
                                    </span>

                                    {e.duty_type === "night" && (
                                        <p className="text-[10px] text-gray-500">
                                            {e.duty_time}
                                        </p>
                                    )}
                                </div>

                                <div className="text-sm truncate">
                                    {e.work_description}
                                </div>

                                <div>₹ {e.batta_amount}</div>

                                <div>
                                    <span className={`text-xs px-2 py-1 rounded-full
                  ${e.status === "approved"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-yellow-100 text-yellow-700"
                                        }`}>
                                        {e.status}
                                    </span>
                                </div>

                            </div>
                        ))}

                    </div>

                    {/* DOWNLOAD */}
                    <button
                        onClick={handleDownload}
                        disabled={!canDownload()}
                        className={`mt-4 w-full py-2 rounded-lg text-white flex items-center justify-center gap-2
            ${canDownload()
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-gray-400 cursor-not-allowed"
                            }`}
                    >
                        <Download className="w-4 h-4" />
                        Download PDF
                    </button>

                </div>
            )}

        </div>
    );
}