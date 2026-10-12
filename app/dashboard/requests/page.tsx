"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import readExcelFile from "read-excel-file/browser";

type CustomerRequest = {
  id: string;
  name: string;
  contact: string;
  service: string;
};

const monthlyLimit = 500;
const maximumFileSize = 10 * 1024 * 1024;

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function rowsToRequests(rows: unknown[][]): CustomerRequest[] {
  if (rows.length < 2) throw new Error("The file needs a header row and at least one customer.");

  const headers = rows[0].map(normalizeHeader);
  const nameIndex = headers.findIndex((header) => ["name", "customername"].includes(header));
  const phoneIndex = headers.findIndex((header) => ["phone", "phonenumber", "mobile"].includes(header));
  const emailIndex = headers.findIndex((header) => header === "email");
  const contactIndex = headers.findIndex((header) => ["contact", "phoneemail", "emailphone"].includes(header));
  const serviceIndex = headers.findIndex((header) => ["service", "department", "servicedepartment"].includes(header));

  if (nameIndex < 0 || (phoneIndex < 0 && emailIndex < 0 && contactIndex < 0) || serviceIndex < 0) {
    throw new Error("Add Name, Phone or Email, and Service or Department columns to your file.");
  }

  return rows.slice(1).flatMap((row) => {
    const name = String(row[nameIndex] ?? "").trim();
    const contact = String(row[contactIndex] ?? row[phoneIndex] ?? row[emailIndex] ?? "").trim();
    const service = String(row[serviceIndex] ?? "").trim();
    if (!name && !contact && !service) return [];
    if (!name || !contact || !service) return [];
    return [{ id: crypto.randomUUID(), name, contact, service }];
  });
}

function readFileWithProgress(file: File, onProgress: (progress: number) => void) {
  return new Promise<string | ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 90));
    };
    reader.onerror = () => reject(new Error("This file could not be read. Try another file."));
    reader.onload = () => {
      if (typeof reader.result === "string" || reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("This file could not be read. Try another file."));
      }
    };
    if (file.name.toLowerCase().endsWith(".csv")) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  });
}

export default function RequestsPage() {
  const [requestsSent, setRequestsSent] = useState(142);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [service, setService] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const usagePercent = Math.min((requestsSent / monthlyLimit) * 100, 100);
  const remainingRequests = Math.max(monthlyLimit - requestsSent, 0);

  function addRequests(newRequests: CustomerRequest[]) {
    setRequests((current) => [...newRequests, ...current]);
    setRequestsSent((current) => current + newRequests.length);
  }

  function submitSingleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (remainingRequests < 1) {
      setFormMessage("You have reached this month's request limit.");
      return;
    }

    addRequests([{ id: crypto.randomUUID(), name: name.trim(), contact: contact.trim(), service }]);
    setFormMessage(`Request queued for ${name.trim()}.`);
    setName("");
    setContact("");
    setService("");
  }

  async function importFile(file?: File) {
    if (!file) return;
    setUploadMessage("");
    setUploadProgress(0);

    const extension = file.name.toLowerCase().split(".").pop();
    if (extension !== "csv" && extension !== "xlsx") {
      setUploadMessage("Choose a CSV or Excel (.xlsx) file.");
      return;
    }
    if (file.size > maximumFileSize) {
      setUploadMessage("Files must be 10 MB or smaller.");
      return;
    }
    if (remainingRequests < 1) {
      setUploadMessage("You have reached this month's request limit.");
      return;
    }

    setIsImporting(true);
    try {
      const fileData = await readFileWithProgress(file, setUploadProgress);
      setUploadProgress(95);
      let rows: unknown[][];

      if (extension === "csv") {
        const result = Papa.parse<unknown[]>(fileData as string, { skipEmptyLines: "greedy" });
        if (result.errors.length) throw new Error("Check the CSV formatting and try again.");
        rows = result.data;
      } else {
        const sheets = await readExcelFile(fileData as ArrayBuffer);
        rows = sheets[0]?.data ?? [];
      }

      const importedRequests = rowsToRequests(rows);
      if (importedRequests.length === 0) throw new Error("No complete customer rows were found.");
      if (importedRequests.length > remainingRequests) {
        throw new Error(`This file has ${importedRequests.length} complete rows, but only ${remainingRequests} requests remain this month.`);
      }

      addRequests(importedRequests);
      setUploadProgress(100);
      setUploadMessage(`${importedRequests.length} ${importedRequests.length === 1 ? "request" : "requests"} added to your queue.`);
    } catch (error) {
      setUploadProgress(0);
      setUploadMessage(error instanceof Error ? error.message : "This file could not be imported.");
    } finally {
      setIsImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
      <div className="mx-auto max-w-[1180px] px-5 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10">
            <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#929188]">Customer outreach</p>
                <h1 className="mt-2 text-[28px] font-medium leading-tight tracking-[-0.05em] sm:text-[32px]">Review requests</h1>
                <p className="mt-2 text-[12px] text-[#929188]">Invite customers to share feedback after a visit.</p>
              </div>
            </section>

            <section aria-labelledby="usage-heading" className="mb-6 rounded-[6px] border border-white/[0.09] bg-[#171814] p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium text-[#a5a49a]" id="usage-heading">Monthly request usage</p>
                  <p className="mt-2 text-[25px] font-medium leading-none tracking-[-0.05em]">{requestsSent}<span className="ml-1 text-[13px] text-[#85857c]">/ {monthlyLimit} requests</span></p>
                </div>
                <p className="text-[10px] text-[#a5a49a]">{remainingRequests} requests remaining <span className="mx-1 text-[#51524a]">·</span> Resets monthly</p>
              </div>
              <div aria-label={`${Math.round(usagePercent)} percent of monthly requests used`} className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuemax={monthlyLimit} aria-valuemin={0} aria-valuenow={requestsSent}>
                <div className="h-full rounded-full bg-[#c7f36b] transition-[width] duration-500" style={{ width: `${usagePercent}%` }} />
              </div>
            </section>

            <div className="grid items-start gap-5 xl:grid-cols-2">
              <section aria-labelledby="single-heading" className="rounded-[6px] border border-white/[0.09] bg-[#171814] p-4 sm:p-5">
                <div className="mb-5 border-b border-white/[0.08] pb-4">
                  <h2 className="text-[14px] font-medium text-[#f0efe7]" id="single-heading">Send one request</h2>
                  <p className="mt-1 text-[10px] text-[#85857c]">Add a customer and queue their review invitation.</p>
                </div>
                <form className="space-y-4" onSubmit={submitSingleRequest}>
                  <label className="block text-[10px] font-medium text-[#b9b8ae]">Customer name
                    <input autoComplete="name" className="mt-2 h-10 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 text-[11px] text-[#eeede4] outline-none transition-colors placeholder:text-[#686960] focus:border-[#c7f36b]/60" onChange={(event) => setName(event.target.value)} placeholder="e.g. Jamie Rivera" required value={name} />
                  </label>
                  <label className="block text-[10px] font-medium text-[#b9b8ae]">Phone or email
                    <input autoComplete="email" className="mt-2 h-10 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 text-[11px] text-[#eeede4] outline-none transition-colors placeholder:text-[#686960] focus:border-[#c7f36b]/60" onChange={(event) => setContact(event.target.value)} placeholder="jamie@example.com or (555) 012-3456" required value={contact} />
                  </label>
                  <label className="block text-[10px] font-medium text-[#b9b8ae]">Service / department
                    <select className="mt-2 h-10 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 text-[11px] text-[#eeede4] outline-none focus:border-[#c7f36b]/60" onChange={(event) => setService(event.target.value)} required value={service}>
                      <option disabled value="">Choose a service</option><option>General</option><option>Clinic visit</option><option>Hair &amp; beauty</option><option>Personal training</option><option>Dining</option><option>Other</option>
                    </select>
                  </label>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-[#c7f36b] px-4 text-[10px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e] disabled:cursor-not-allowed disabled:opacity-40" disabled={remainingRequests === 0} type="submit">Queue request <span aria-hidden="true">↗</span></button>
                    <p aria-live="polite" className="text-[10px] text-[#c7f36b]" role="status">{formMessage}</p>
                  </div>
                </form>
              </section>

              <section aria-labelledby="bulk-heading" className="rounded-[6px] border border-white/[0.09] bg-[#171814] p-4 sm:p-5">
                <div className="mb-5 border-b border-white/[0.08] pb-4">
                  <h2 className="text-[14px] font-medium text-[#f0efe7]" id="bulk-heading">Import a customer list</h2>
                  <p className="mt-1 text-[10px] text-[#85857c]">Add multiple customers from a spreadsheet.</p>
                </div>
                <input accept=".csv,.xlsx" className="sr-only" disabled={isImporting || remainingRequests === 0} onChange={(event) => void importFile(event.target.files?.[0])} ref={fileInput} type="file" />
                <button
                  className={`flex min-h-[174px] w-full flex-col items-center justify-center rounded-[5px] border border-dashed px-5 text-center transition-colors ${isDragging ? "border-[#c7f36b]/70 bg-[#c7f36b]/[0.07]" : "border-white/[0.16] bg-[#10110f]/50 hover:border-white/30"} disabled:cursor-not-allowed disabled:opacity-40`}
                  disabled={isImporting || remainingRequests === 0}
                  onClick={() => fileInput.current?.click()}
                  onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); setIsDragging(false); void importFile(event.dataTransfer.files[0]); }}
                  type="button"
                >
                  <span aria-hidden="true" className="mb-3 flex size-9 items-center justify-center rounded-[4px] border border-[#c7f36b]/25 bg-[#c7f36b]/[0.07] text-[17px] text-[#c7f36b]">↑</span>
                  <span className="text-[11px] font-medium text-[#e7e6dd]">Drop your file here or <span className="text-[#c7f36b]">browse</span></span>
                  <span className="mt-1.5 text-[9px] text-[#85857c]">CSV or Excel (.xlsx) · Up to 10 MB</span>
                  <span className="mt-2 text-[9px] text-[#686960]">Columns: Name, Phone or Email, Service or Department</span>
                </button>
                {(isImporting || uploadProgress > 0) && (
                  <div className="mt-4" aria-live="polite">
                    <div className="mb-2 flex justify-between text-[9px] text-[#a5a49a]"><span>{isImporting ? "Reading and validating locally" : "Import complete"}</span><span>{uploadProgress}%</span></div>
                    <div aria-label="File import progress" className="h-1 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={uploadProgress}>
                      <div className="h-full rounded-full bg-[#7fb8be] transition-[width] duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
                <p aria-live="polite" className={`mt-3 min-h-4 text-[10px] ${uploadMessage.startsWith("This") || uploadMessage.startsWith("Add") || uploadMessage.startsWith("No ") ? "text-[#ee9b8b]" : "text-[#c7f36b]"}`} role="status">{uploadMessage}</p>
              </section>
            </div>

            <section aria-labelledby="queue-heading" className="mt-5 overflow-hidden rounded-[6px] border border-white/[0.09] bg-[#171814]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-4 sm:px-5">
                <div><h2 className="text-[13px] font-medium text-[#f0efe7]" id="queue-heading">Recently queued</h2><p className="mt-1 text-[10px] text-[#85857c]">New requests added in this session</p></div>
                <span className="text-[10px] text-[#85857c]">{requests.length} {requests.length === 1 ? "request" : "requests"}</span>
              </div>
              {requests.length === 0 ? (
                <p className="px-4 py-8 text-center text-[10px] text-[#77786e] sm:px-5">Requests you add will appear here.</p>
              ) : (
                <div className="divide-y divide-white/[0.07]">
                  {requests.slice(0, 6).map((request) => (
                    <article className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5" key={request.id}>
                      <div className="min-w-0"><p className="truncate text-[11px] font-medium text-[#e7e6dd]">{request.name}</p><p className="mt-1 truncate text-[9px] text-[#85857c]">{request.contact} <span className="mx-1">·</span> {request.service}</p></div>
                      <span className="inline-flex items-center gap-1.5 text-[9px] text-[#c7f36b]"><span className="size-1.5 rounded-full bg-[#c7f36b]" />Queued</span>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <footer className="flex flex-col gap-2 py-6 text-[9px] text-[#686960] sm:flex-row sm:items-center sm:justify-between">
              <p>TableSignal · Local reputation, made manageable.</p>
              <p>Requests are stored in this session · <a className="text-[#929188] hover:text-[#c7f36b]" href="mailto:hello@tablesignal.com">Get support</a></p>
            </footer>
          </div>
  );
}
