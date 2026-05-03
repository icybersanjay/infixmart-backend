"use client";

import { useEffect, useRef, useState } from "react";
import { MdAdd, MdDelete, MdEdit, MdCheck, MdClose } from "react-icons/md";
import adminAxios from "../_lib/adminAxios";
import toast, { Toaster } from "react-hot-toast";

// ── Inline type name edit ─────────────────────────────────────────────────────
function InlineNameEdit({ type, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(type.name);

  const save = async () => {
    if (!val.trim() || val.trim() === type.name) { setEditing(false); return; }
    try {
      await adminAxios.put(`/api/admin/attributes/${type.id}`, { name: val.trim() });
      onSaved({ ...type, name: val.trim() });
      toast.success("Renamed successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Rename failed");
      setVal(type.name);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex gap-1.5 items-center flex-1">
        <input
          value={val} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          className="flex-1 px-2 py-1 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-[#1565C0]"
        />
        <button onClick={save} className="p-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"><MdCheck className="text-[14px]" /></button>
        <button onClick={() => setEditing(false)} className="p-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><MdClose className="text-[14px]" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-1">
      <span className="font-[700] text-[#1A237E] text-[13px]">{type.name}</span>
      <button onClick={() => setEditing(true)} className="p-0.5 text-[#1565C0] hover:text-[#0D47A1] transition-colors">
        <MdEdit className="text-[13px]" />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AttributeManagement() {
  const [types,         setTypes]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [newTypeName,   setNewTypeName]   = useState("");
  const [addingType,    setAddingType]    = useState(false);
  const [deletingType,  setDeletingType]  = useState(null);
  const [newValue,      setNewValue]      = useState("");
  const [addingValue,   setAddingValue]   = useState(false);
  const [deletingValue, setDeletingValue] = useState(null);
  const typeInputRef = useRef();

  const loadTypes = async () => {
    setLoading(true);
    try {
      const res  = await adminAxios.get("/api/admin/attributes");
      const data = res.data.data || [];
      setTypes(data);
      if (selected) {
        const updated = data.find((t) => t.id === selected.id);
        setSelected(updated || null);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTypes(); }, []);

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    setAddingType(true);
    try {
      const res = await adminAxios.post("/api/admin/attributes", { name: newTypeName.trim() });
      const newType = res.data.data;
      setTypes((p) => [...p, newType]);
      setNewTypeName("");
      typeInputRef.current?.focus();
      toast.success(`"${newType.name}" added`);
    } catch (err) { toast.error(err.response?.data?.message || "Already exists"); }
    finally { setAddingType(false); }
  };

  const handleDeleteType = async (type) => {
    setDeletingType(type.id);
    try {
      await adminAxios.delete(`/api/admin/attributes/${type.id}`);
      setTypes((p) => p.filter((t) => t.id !== type.id));
      if (selected?.id === type.id) setSelected(null);
      toast.success(`"${type.name}" deleted`);
    } catch { toast.error("Delete failed"); }
    finally { setDeletingType(null); }
  };

  const handleAddValue = async () => {
    if (!newValue.trim() || !selected) return;
    setAddingValue(true);
    try {
      const res = await adminAxios.post(`/api/admin/attributes/${selected.id}/values`, { value: newValue.trim() });
      const added = res.data.data;
      setSelected((p) => ({ ...p, values: [...(p.values || []), added] }));
      setTypes((p) => p.map((t) => t.id === selected.id ? { ...t, values: [...(t.values || []), added] } : t));
      setNewValue("");
    } catch (err) { toast.error(err.response?.data?.message || "Add failed"); }
    finally { setAddingValue(false); }
  };

  const handleDeleteValue = async (valueId) => {
    setDeletingValue(valueId);
    try {
      await adminAxios.delete(`/api/admin/attributes/${selected.id}/values/${valueId}`);
      const updated = (selected.values || []).filter((v) => v.id !== valueId);
      setSelected((p) => ({ ...p, values: updated }));
      setTypes((p) => p.map((t) => t.id === selected.id ? { ...t, values: updated } : t));
    } catch { toast.error("Delete failed"); }
    finally { setDeletingValue(null); }
  };

  const selectedValues = selected?.values || [];

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      <h2 className="text-[16px] font-[800] text-[#1A237E]">Product Attributes</h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">

        {/* ── LEFT: Attribute types ── */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#F8FAFF] border-b border-gray-100">
            <span className="font-[700] text-[#1A237E] text-[13px]">Attribute Types</span>
            <span className="bg-blue-100 text-[#1565C0] text-[11px] font-[700] rounded-full px-2 py-0.5">{types.length}</span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400 text-[13px]">Loading…</div>
          ) : types.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-[13px]">No attribute types yet.</div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {types.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setSelected(type)}
                  className={`flex items-center gap-2 px-4 py-3 cursor-pointer border-b border-gray-50 transition-colors border-l-4 ${selected?.id === type.id ? "bg-blue-50 border-l-[#1565C0]" : "hover:bg-gray-50 border-l-transparent"}`}
                >
                  <InlineNameEdit type={type} onSaved={loadTypes} />
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">{(type.values || []).length} vals</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteType(type); }}
                    disabled={deletingType === type.id}
                    className="p-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40 flex-shrink-0"
                    title="Delete type"
                  >
                    <MdDelete className="text-[13px]" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add type input */}
          <div className="flex gap-2 px-4 py-3 border-t border-gray-100">
            <input
              ref={typeInputRef}
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddType(); }}
              placeholder="e.g. Color"
              className="flex-1 px-3 py-2 text-[13px] bg-[#F8FAFF] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] transition-all"
            />
            <button
              onClick={handleAddType}
              disabled={addingType || !newTypeName.trim()}
              className="p-2 bg-[#1565C0] text-white rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingType ? <span className="text-[12px] px-0.5">…</span> : <MdAdd className="text-[18px]" />}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Values ── */}
        <div className="md:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#F8FAFF] border-b border-gray-100">
            {selected ? (
              <>
                <span className="font-[700] text-[#1A237E] text-[13px]">{selected.name} Values</span>
                <span className="bg-blue-100 text-[#1565C0] text-[11px] font-[700] rounded-full px-2 py-0.5">{selectedValues.length}</span>
              </>
            ) : (
              <span className="text-gray-400 text-[13px]">← Select an attribute type to manage its values</span>
            )}
          </div>

          {!selected ? (
            <div className="py-16 px-8 text-center">
              <div className="text-[2rem] mb-3">🏷️</div>
              <p className="text-gray-400 text-[13px]">Select an attribute type on the left to see and manage its values.</p>
              <p className="text-gray-300 text-[12px] mt-1">Examples: Color → Black, Blue · Size → S, M, L, XL · Weight → 500g, 1kg</p>
            </div>
          ) : (
            <>
              <div className="p-4 min-h-[180px]">
                {selectedValues.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-[13px]">No values yet. Add some below.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedValues.map((v) => (
                      <div key={v.id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 text-[13px] text-gray-700">
                        <span>{v.value}</span>
                        <button
                          onClick={() => handleDeleteValue(v.id)}
                          disabled={deletingValue === v.id}
                          className={`flex items-center transition-colors ${deletingValue === v.id ? "text-gray-300 cursor-not-allowed" : "text-red-400 hover:text-red-600"}`}
                          title="Remove"
                        >
                          <MdClose className="text-[13px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 px-4 py-3 border-t border-gray-100">
                <input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddValue(); }}
                  placeholder={`Add value to ${selected.name}…`}
                  className="flex-1 px-3 py-2 text-[13px] bg-[#F8FAFF] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] transition-all"
                />
                <button
                  onClick={handleAddValue}
                  disabled={addingValue || !newValue.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MdAdd className="text-[15px]" />{addingValue ? "Adding…" : "Add"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tip */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-[12px] text-[#1565C0]">
        <strong>Tip:</strong> These attribute types and values feed the Variants section in the Product Add/Edit form. Create your attribute types here first, then use them when adding products.
      </div>
    </div>
  );
}
