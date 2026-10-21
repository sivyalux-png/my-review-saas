"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import readExcelFile from "read-excel-file/browser";
import {
  createReviewRequest,
  importReviewRequests,
  type ReviewRequestImportRow,
} from "./actions";
import { isEmailContact, sendReviewEmail } from "./send-review";

type CustomerRequest = {
  id: string;
  name: string;
  contact: string;
  service: string;
  status: string;
};

type RequestsPageProps = {
  initialCreditsRemaining: number;
  monthlyCreditLimit: number;
  initialRequests: CustomerRequest[];
};

const maximumFileSize = 10 * 1024 * 1024;
const maximumImportRows = 200;

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function rowsToRequests(rows: unknown[][]): {
  requests: ReviewRequestImportRow[];
  skipped: number;
} {
  if (rows.length < 2) throw new Error("The file needs a header row and at least one customer.");

  const headers = rows[0].map(normalizeHeader);
  const nameIndex = headers.findIndex((header) => ["name", "customername"].includes(header));
  const phoneIndex = headers.findIndex((header) => ["phone", "phonenumber", "mobile"].includes(header));
  const emailIndex = headers.findIndex((header) => header === "email");
  const contactIndex = headers.findIndex((header) => ["contact", "phoneemail", "emailphone", "phoneoremail", "emailorphone"].includes(header));
  const serviceIndex = headers.findIndex((header) => ["service", "department", "servicedepartment", "serviceordepartment"].includes(header));

  if (nameIndex < 0 || (phoneIndex < 0 && emailIndex < 0 && contactIndex < 0) || serviceIndex < 0) {
    throw new Error("Add Name, Phone or Email, and Service or Department columns to your file.");
  }

  let skipped = 0;
  const requests: ReviewRequestImportRow[] = rows.slice(1).flatMap((row) => {
    const name = String(row[nameIndex] ?? "").trim();
    const contact = [row[contactIndex], row[phoneIndex], row[emailIndex]]
      .map((value) => String(value ?? "").trim())
      .find(Boolean) ?? "";
    const service = String(row[serviceIndex] ?? "").trim();
    if (!name && !contact && !service) return [];
    if (!name || !contact || !service || name.length > 120 || contact.length > 254 || service.length > 120) {
      skipped += 1;
      return [];
    }
    return [{ name, contact, service }];
  });

  if (requests.length === 0) throw new Error("No complete customer rows were found.");
  if (requests.length > maximumImportRows) {
    throw new Error(`Import up to ${maximumImportRows} valid customers at a time.`);
  }
  return { requests, skipped };
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

export default function RequestsClient({
  initialCreditsRemaining,
  monthlyCreditLimit,
  initialRequests,
}: RequestsPageProps) {
  const router = useRouter();
  const [creditsRemaining, setCreditsRemaining] = useState(initialCreditsRemaining);
  const [requests, setRequests] = useState<CustomerRequest[]>(initialRequests);
  const requestsSent = Math.max(monthlyCreditLimit - creditsRemaining, 0);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [service, setService] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadIsError, setUploadIsError] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const usagePercent = monthlyCreditLimit > 0
    ? Math.min((requestsSent / monthlyCreditLimit) * 100, 100)
    : 0;
  const remainingRequests = creditsRemaining;

  function addRequests(newRequests: CustomerRequest[]) {
    setRequests((current) => [...newRequests, ...current].slice(0, 20));
  }

  async function submitSingleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (remainingRequests < 1) {
      setFormMessage("You have reached this month's request limit.");
      return;
    }

    setFormMessage("Creating request…");
    try {
      const result = await createReviewRequest(name, contact, "", service);
      if (!result.ok) {
        setFormMessage(result.message);
        return;
      }

      setCreditsRemaining(result.creditsRemaining);
      const emailResult = isEmailContact(contact)
        ? await sendReviewEmail(result.requestId)
        : null;
      addRequests([{
        id: result.requestId,
        name: name.trim(),
        contact: contact.trim(),
        service,
        status: emailResult?.ok ? "sent" : "queued",
      }]);
      setFormMessage(emailResult?.ok
        ? `Review email sent to ${contact.trim()}.`
        : emailResult
          ? emailResult.message
          : `Request queued for ${name.trim()}.`);
      setName("");
      setContact("");
      setService("");
      router.refresh();
    } catch (error) {
      console.error("Unable to create a review request from the Requests page.", error);
      setFormMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function importFile(file?: File) {
    if (!file) return;
    setUploadMessage("");
    setUploadIsError(false);
    setUploadProgress(0);

    const extension = file.name.toLowerCase().split(".").pop();
    if (extension !== "csv" && extension !== "xlsx") {
      setUploadMessage("Choose a CSV or Excel (.xlsx) file.");
      setUploadIsError(true);
      return;
    }
    if (file.size > maximumFileSize) {
      setUploadMessage("Files must be 10 MB or smaller.");
      setUploadIsError(true);
      return;
    }
    if (remainingRequests < 1) {
      setUploadMessage("You have no credits available. Activate or top up a plan to continue.");
      setUploadIsError(true);
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

      const { requests: importedRequests, skipped } = rowsToRequests(rows);
      if (importedRequests.length > remainingRequests) {
        throw new Error(`This file has ${importedRequests.length} valid customers, but only ${remainingRequests} credits remain.`);
      }

      setUploadProgress(96);
      const result = await importReviewRequests(importedRequests);
      if (!result.ok) throw new Error(result.message);

      setCreditsRemaining(result.creditsRemaining);
      addRequests(importedRequests.map((request) => ({
        id: crypto.randomUUID(),
        name: request.name,
        contact: request.contact,
        service: request.service,
        status: "queued",
      })));
      setUploadProgress(100);
      const importedMessage = `${result.importedCount} ${result.importedCount === 1 ? "customer" : "customers"} successfully imported and queued`;
      setUploadMessage(skipped > 0
        ? `${importedMessage}; ${skipped} incomplete or invalid ${skipped === 1 ? "row was" : "rows were"} skipped.`
        : `${importedMessage}.`);
      router.refresh();
    } catch (error) {
      setUploadProgress(0);
      setUploadIsError(true);
      setUploadMessage(error instanceof Error ? error.message : "This file could not be imported.");
    } finally {
      setIsImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
      <div className="requests-page mx-auto max-w-[1180px] px-5 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10">
            <section className="requests-hero mb-5">
              <p className="requests-eyebrow">Customer outreach</p>
              <h1>
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                  <path d="M7.5 10.25 11 5a2 2 0 0 1 3.5 1.75L14 10h3.75a2 2 0 0 1 1.94 2.5l-1.25 5A2 2 0 0 1 16.5 19H9.25a2 2 0 0 1-1.75-1.03M7.5 10.25V18M4 10.25h3.5v8.5H4a1 1 0 0 1-1-1v-6.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.65" />
                </svg>
                Review Requests
              </h1>
              <p>Invite customers to share feedback after a visit.</p>
            </section>

            <section aria-labelledby="usage-heading" className="requests-usage mb-5 rounded-[6px] border border-white/[0.09] bg-[#171814] p-4 sm:p-5">
              <div className="requests-usage-top">
                <h2 id="usage-heading">Usage</h2>
                <div className="requests-usage-count">
                  <strong>{requestsSent.toLocaleString()} / {monthlyCreditLimit.toLocaleString()}</strong>
                  <span><i aria-hidden="true" /> Used</span>
                </div>
              </div>
              <p className="requests-usage-label">Monthly request usage</p>
              <div aria-label={`${Math.round(usagePercent)} percent of initial email credits used`} className="requests-progress-track" role="progressbar" aria-valuemax={monthlyCreditLimit} aria-valuemin={0} aria-valuenow={requestsSent}>
                <div className="requests-progress-value transition-[width] duration-500" style={{ width: `${usagePercent}%` }} />
              </div>
              <div className="requests-usage-footer">
                <p>Available Credits: <strong>{remainingRequests.toLocaleString()}</strong><span className="requests-expiry"><svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M12 3.5 19 6v5.2c0 4.3-2.9 7.5-7 9.3-4.1-1.8-7-5-7-9.3V6l7-2.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" /><path d="m9 11.5 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></svg>Credits never expire</span></p>
                <Link href="/dashboard/plan">Buy extra credits</Link>
              </div>
            </section>

            <div className="requests-actions-grid grid items-start gap-4 xl:grid-cols-2">
              <section aria-labelledby="single-heading" className="requests-panel rounded-[6px] border border-white/[0.09] bg-[#171814] p-4 sm:p-5">
                <div className="requests-panel-heading mb-4">
                  <span aria-hidden="true" className="requests-panel-icon requests-mail-icon"><svg fill="none" viewBox="0 0 24 24"><rect height="14" rx="3" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="5" /><path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg></span>
                  <div>
                    <h2 id="single-heading">Send one request</h2>
                    <p>Add a customer and queue their review invitation.</p>
                  </div>
                </div>
                <form className="requests-form space-y-3" onSubmit={submitSingleRequest}>
                  <label className="requests-field block text-[10px] font-medium text-[#b9b8ae]">Customer name
                    <input autoComplete="name" className="requests-input mt-1.5 h-10 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 text-[11px] text-[#eeede4] outline-none transition-colors placeholder:text-[#686960] focus:border-[#c7f36b]/60" onChange={(event) => setName(event.target.value)} placeholder="e.g. Jamie Rivera" required value={name} />
                  </label>
                  <label className="requests-field block text-[10px] font-medium text-[#b9b8ae]">Phone or email
                    <input autoComplete="email" className="requests-input mt-1.5 h-10 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 text-[11px] text-[#eeede4] outline-none transition-colors placeholder:text-[#686960] focus:border-[#c7f36b]/60" onChange={(event) => setContact(event.target.value)} placeholder="Phone or email" required value={contact} />
                  </label>
                  <label className="requests-field block text-[10px] font-medium text-[#b9b8ae]">Service / department
                    <select className="requests-input mt-1.5 h-10 w-full rounded-[4px] border border-white/[0.11] bg-[#10110f] px-3 text-[11px] text-[#eeede4] outline-none focus:border-[#c7f36b]/60" onChange={(event) => setService(event.target.value)} required value={service}>
                      <option disabled value="">Choose a service</option><option>General</option><option>Clinic visit</option><option>Hair &amp; beauty</option><option>Personal training</option><option>Dining</option><option>Other</option>
                    </select>
                  </label>
                  <div className="requests-form-actions flex flex-wrap items-center gap-3 pt-1">
                    <button className="requests-primary inline-flex h-10 items-center gap-2 rounded-[4px] bg-[#c7f36b] px-4 text-[10px] font-semibold text-[#171a11] transition-colors hover:bg-[#d8ff8e] disabled:cursor-not-allowed disabled:opacity-40" disabled={remainingRequests === 0} type="submit">Queue request <span aria-hidden="true">✓</span></button>
                    <p aria-live="polite" className="text-[10px] text-[#c7f36b]" role="status">{formMessage}</p>
                  </div>
                </form>
              </section>

              <section aria-labelledby="bulk-heading" className="requests-panel rounded-[6px] border border-white/[0.09] bg-[#171814] p-4 sm:p-5">
                <div className="requests-panel-heading mb-4">
                  <span aria-hidden="true" className="requests-panel-icon requests-import-icon"><svg fill="none" viewBox="0 0 24 24"><path d="M12 15V4m0 0L8 8m4-4 4 4M5 14v5h14v-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg></span>
                  <div>
                    <h2 id="bulk-heading">Import a customer list</h2>
                    <p>Add multiple customers from a spreadsheet.</p>
                  </div>
                </div>
                <input accept=".csv,.xlsx" className="sr-only" disabled={isImporting} onChange={(event) => void importFile(event.target.files?.[0])} ref={fileInput} type="file" />
                <button
                  className={`requests-dropzone flex min-h-[174px] w-full flex-col items-center justify-center rounded-[5px] border border-dashed px-5 text-center transition-colors ${isDragging ? "requests-dropzone-active" : ""} disabled:cursor-not-allowed disabled:opacity-40`}
                  disabled={isImporting}
                  onClick={() => fileInput.current?.click()}
                  onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); setIsDragging(false); void importFile(event.dataTransfer.files[0]); }}
                  type="button"
                >
                  <span aria-hidden="true" className="requests-upload-art"><span className="requests-upload-bubble requests-upload-bubble-blue"><svg fill="none" viewBox="0 0 24 24"><path d="M19.5 11.25a7.25 7.25 0 0 1-10.82 6.3L4.5 19l.95-3.97A7.25 7.25 0 1 1 19.5 11.25Z" fill="currentColor" /><path d="M8.5 10h7m-7 3h5" stroke="white" strokeLinecap="round" strokeWidth="1.3" /></svg></span><span className="requests-upload-bubble requests-upload-bubble-teal"><svg fill="none" viewBox="0 0 24 24"><path d="M19.25 11.5a7.25 7.25 0 0 1-10.82 6.3L4.25 19l.95-3.97A7.25 7.25 0 1 1 19.25 11.5Z" fill="currentColor" /><path d="M9 8.8c.35 2.55 1.65 3.85 4.2 4.2" stroke="white" strokeLinecap="round" strokeWidth="1.3" /></svg></span></span>
                  <span className="requests-dropzone-copy">Drop your file here or <span>browse</span></span>
                  <span className="mt-1.5 text-[9px] text-[#85857c]">CSV or Excel (.xlsx) · Up to 10 MB</span>
                  <span className="mt-2 text-[9px] text-[#686960]">Columns: Name, Phone or Email, Service or Department</span>
                </button>
                {(isImporting || uploadProgress > 0) && (
                  <div className="mt-4" aria-live="polite">
                    <div className="mb-2 flex justify-between text-[9px] text-[#a5a49a]"><span>{uploadProgress < 96 ? "Reading and validating file" : uploadProgress < 100 ? "Saving requests and credits" : "Import complete"}</span><span>{uploadProgress}%</span></div>
                      <div aria-label="File import progress" className="requests-progress-track h-1 overflow-hidden rounded-full" role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={uploadProgress}>
                      <div className="requests-progress-value h-full rounded-full transition-[width] duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
                <p aria-live="polite" className={`mt-3 min-h-4 text-[10px] ${uploadIsError ? "text-[#ee9b8b]" : "text-[#c7f36b]"}`} role={uploadIsError ? "alert" : "status"}>{uploadMessage}</p>
              </section>
            </div>

            <section aria-labelledby="queue-heading" className="requests-panel requests-queue mt-5 overflow-hidden rounded-[6px] border border-white/[0.09] bg-[#171814]">
              <div className="requests-queue-header flex items-center justify-between border-b border-white/[0.08] px-4 py-4 sm:px-5">
                <div>
                  <h2 id="queue-heading">Recently queued</h2>
                  <p>Latest review requests for your workspace</p>
                </div>
                <span className="requests-queue-count">{requests.length} {requests.length === 1 ? "request" : "requests"}</span>
              </div>
              {requests.length === 0 ? (
                <div className="requests-queue-empty">
                  <span aria-hidden="true" className="requests-queue-empty-icon">
                    <svg fill="none" viewBox="0 0 24 24"><path d="M4 7.5h16v12H4zM4 8l8 6 8-6M8 4.5h8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
                  </span>
                  <p>No requests queued yet</p>
                  <span>New customer requests will appear here.</span>
                </div>
              ) : (
                <div className="requests-queue-list">
                  {requests.slice(0, 6).map((request) => (
                    <article className="requests-queue-row flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5" key={request.id}>
                      <div className="requests-queue-customer">
                        <span aria-hidden="true" className="requests-queue-avatar">{request.name.trim().charAt(0).toUpperCase()}</span>
                        <span className="min-w-0">
                          <span className="requests-queue-name">{request.name}</span>
                          <span className="requests-queue-detail">{request.contact}<i aria-hidden="true" />{request.service}</span>
                        </span>
                      </div>
                      <span className="requests-status"><i aria-hidden="true" />{request.status}</span>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <footer className="flex flex-col gap-2 py-6 text-[9px] text-[#686960] sm:flex-row sm:items-center sm:justify-between">
              <p>TableSignal · Local reputation, made manageable.</p>
              <p>Requests are saved to your workspace · <a className="text-[#929188] hover:text-[#c7f36b]" href="mailto:hello@tablesignal.com">Get support</a></p>
            </footer>
          </div>
  );
}
