"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MdArrowBack, MdCloudUpload, MdDownload, MdCheckCircle, MdWarning } from "react-icons/md";
import adminAxios from "../../_lib/adminAxios";
import toast, { Toaster } from "react-hot-toast";

export default function ProductImport() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [csvText, setCsvText] = useState("");
  const [filename, setFilename] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5 MB).");
      return;
    }
    setFilename(file.name);
    const text = await file.text();
    setCsvText(text);
    setResult(null);
  };

  const reset = () => {
    setCsvText("");
    setFilename("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (asDryRun) => {
    if (!csvText.trim()) {
      toast.error("Pick a CSV file first.");
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const res = await adminAxios.post("/api/admin/import/products", { csv: csvText, dryRun: asDryRun });
      setResult(res.data);
      if (asDryRun) {
        toast.success(`Dry run done. ${res.data.rowCount} rows checked, ${res.data.errors.length} errors.`);
      } else {
        toast.success(`Imported ${res.data.created} new + ${res.data.updated} updated.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Import failed.");
    } finally {
      setRunning(false);
    }
  };

  const downloadSample = async () => {
    try {
      const res = await adminAxios.get("/api/admin/import/products/sample", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url; a.download = "products-import-sample.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download sample.");
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="flex items-center gap-1 text-[12px] font-[600] text-gray-500 hover:text-[#1565C0] transition-colors mb-1"
          >
            <MdArrowBack /> Back to Products
          </button>
          <h2 className="text-[16px] font-[700] text-[#1A237E]">Bulk import products from CSV</h2>
          <p className="text-[12px] text-gray-500 mt-1 max-w-2xl leading-relaxed">
            Upload a CSV with one product per row. We match by <strong>SKU</strong> — existing SKUs get updated, new SKUs get created. Required columns: <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">name</code>, <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">price</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadSample}
          className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 hover:border-[#1565C0] hover:text-[#1565C0] text-[13px] font-[600] text-gray-700 transition-colors"
        >
          <MdDownload className="text-[16px]" /> Download sample CSV
        </button>
      </div>

      {/* Drop zone */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <label
          htmlFor="csv-upload"
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 hover:border-[#1565C0] rounded-xl bg-[#F8FAFF] py-10 cursor-pointer transition-colors"
        >
          <MdCloudUpload className="text-[44px] text-[#1565C0]/70" />
          <div className="text-center">
            <p className="text-[14px] font-[700] text-gray-800">
              {filename ? filename : "Click to upload CSV"}
            </p>
            <p className="text-[12px] text-gray-400 mt-0.5">
              Max 5 MB · Plain UTF-8 CSV with header row
            </p>
          </div>
          <input
            ref={fileRef}
            id="csv-upload"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="sr-only"
          />
        </label>

        {csvText && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={running}
              className="h-10 px-4 rounded-xl border border-gray-200 hover:border-gray-300 text-[13px] font-[600] text-gray-600 disabled:opacity-50 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={running}
              className="h-10 px-4 rounded-xl bg-[#F0F5FF] text-[#1565C0] hover:bg-[#E0EBFF] text-[13px] font-[700] disabled:opacity-50 transition-colors"
            >
              {running && dryRun ? "Validating…" : "Validate (dry run)"}
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={running}
              className="h-10 px-4 rounded-xl bg-[#1565C0] hover:bg-[#0D47A1] text-white text-[13px] font-[700] disabled:opacity-50 transition-colors shadow-sm"
            >
              {running && !dryRun ? "Importing…" : "Import"}
            </button>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            {result.errors?.length === 0 ? (
              <><MdCheckCircle className="text-green-500 text-[20px]" /> <h3 className="text-[14px] font-[700] text-gray-800">All rows passed</h3></>
            ) : (
              <><MdWarning className="text-amber-500 text-[20px]" /> <h3 className="text-[14px] font-[700] text-gray-800">{result.errors.length} row{result.errors.length === 1 ? "" : "s"} had problems</h3></>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <Stat label="Rows" value={result.rowCount} />
            <Stat label={result.dryRun ? "Would create" : "Created"} value={result.dryRun ? result.previews?.filter((p) => p.action === "create").length || 0 : result.created} good />
            <Stat label={result.dryRun ? "Would update" : "Updated"} value={result.dryRun ? result.previews?.filter((p) => p.action === "update").length || 0 : result.updated} good />
            <Stat label="Errors" value={result.errors.length} bad={result.errors.length > 0} />
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4 max-h-64 overflow-y-auto bg-red-50/50 border border-red-100 rounded-xl">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[10px] font-[700] uppercase tracking-wider text-red-600 bg-red-50">
                    <th className="px-3 py-2">Line</th><th className="px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i} className="border-t border-red-100">
                      <td className="px-3 py-1.5 text-red-700 font-[600]">{e.line}</td>
                      <td className="px-3 py-1.5 text-red-700">{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.dryRun && result.previews?.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-[12px] font-[600] text-gray-500 hover:text-[#1565C0]">
                Preview first {Math.min(20, result.previews.length)} of {result.previews.length} rows
              </summary>
              <div className="mt-3 max-h-72 overflow-y-auto border border-gray-100 rounded-xl">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[10px] font-[700] uppercase tracking-wider text-gray-400 bg-gray-50">
                      <th className="px-3 py-2">Line</th>
                      <th className="px-3 py-2">Action</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Stock</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.previews.slice(0, 20).map((p) => (
                      <tr key={p.line} className="border-t border-gray-100">
                        <td className="px-3 py-1.5 text-gray-400">{p.line}</td>
                        <td className="px-3 py-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-[700] uppercase ${p.action === "create" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                            {p.action}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-gray-800">{p.name}</td>
                        <td className="px-3 py-1.5 text-gray-500">{p.sku}</td>
                        <td className="px-3 py-1.5 text-gray-700">₹{Number(p.price).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-1.5 text-gray-700">{p.countInStock}</td>
                        <td className="px-3 py-1.5 text-gray-500">{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {!result.dryRun && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/admin/products")}
                className="h-10 px-4 rounded-xl bg-[#1565C0] hover:bg-[#0D47A1] text-white text-[13px] font-[700] transition-colors"
              >
                Back to Products
              </button>
            </div>
          )}
        </div>
      )}

      {/* Column reference */}
      <details className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <summary className="cursor-pointer text-[13px] font-[700] text-gray-700">
          Supported columns ({result?.expectedColumns?.length ?? 24})
        </summary>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-[12px] text-gray-600">
          {(result?.expectedColumns || [
            "name", "slug", "sku", "status", "description", "brand",
            "price", "oldprice", "discount", "category", "subCategory", "thirdSubCategory",
            "countInStock", "rating", "isFeatured", "reorderThreshold",
            "image1", "image2", "image3", "image4", "image5",
            "videoUrl", "saleEndsAt",
          ]).map((c) => (
            <code key={c} className="text-[11px] bg-gray-50 px-2 py-0.5 rounded">{c}</code>
          ))}
        </div>
      </details>
    </div>
  );
}

function Stat({ label, value, good = false, bad = false }) {
  return (
    <div className={`rounded-xl border p-3 ${good ? "bg-green-50 border-green-100" : bad ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
      <div className={`text-[20px] font-[800] ${good ? "text-green-700" : bad ? "text-red-700" : "text-gray-800"}`}>{value}</div>
      <div className="text-[10px] font-[700] uppercase tracking-wider text-gray-400">{label}</div>
    </div>
  );
}
