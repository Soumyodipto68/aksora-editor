"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type SearchResult = {
  id: string;
  title: string;
  folderPath: string;
  snippet: string;
};

export default function WorkspaceSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const [searchResponse, setSearchResponse] = useState<{
    query: string;
    results?: SearchResult[];
    error?: string;
  } | null>(null);
  const normalizedQuery = query.trim();

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedQuery(normalizedQuery),
      250,
    );

    return () => window.clearTimeout(timeout);
  }, [normalizedQuery]);

  useEffect(() => {
    if (!debouncedQuery) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/works/search?q=${encodeURIComponent(debouncedQuery)}`,
            { signal: controller.signal },
          );
          const data: { results?: SearchResult[]; error?: string } =
            await response.json();

          if (!response.ok) {
            throw new Error(data.error ?? "Search failed.");
          }

          setSearchResponse({
            query: debouncedQuery,
            results: data.results ?? [],
          });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }

          console.error("Workspace search failed:", error);
          setSearchResponse({
            query: debouncedQuery,
            error:
              error instanceof Error
                ? error.message
                : "Unable to search your workspace right now.",
          });
        }
      })();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [debouncedQuery]);

  const isDebouncing =
    normalizedQuery.length > 0 && normalizedQuery !== debouncedQuery;
  const isSearching =
    normalizedQuery.length > 0 &&
    (isDebouncing || searchResponse?.query !== normalizedQuery);
  const results =
    searchResponse?.query === normalizedQuery
      ? (searchResponse.results ?? [])
      : [];
  const error =
    searchResponse?.query === normalizedQuery ? searchResponse.error : undefined;
  const hasSearched =
    searchResponse?.query === normalizedQuery && !searchResponse.error;

  function getResultLinks() {
    return Array.from(
      resultsRef.current?.querySelectorAll<HTMLAnchorElement>(
        "[data-search-result]",
      ) ?? [],
    );
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      const firstResult = getResultLinks()[0];

      if (firstResult) {
        event.preventDefault();
        firstResult.focus();
      }
    }
  }

  function handleResultKeyDown(
    event: KeyboardEvent<HTMLAnchorElement>,
    index: number,
  ) {
    const links = getResultLinks();

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex =
        event.key === "ArrowDown" ? index + 1 : index - 1;

      if (nextIndex >= 0 && nextIndex < links.length) {
        links[nextIndex].focus();
      } else if (event.key === "ArrowUp" && index === 0) {
        document.getElementById("workspace-search")?.focus();
      }
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      links[event.key === "Home" ? 0 : links.length - 1]?.focus();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      document.getElementById("workspace-search")?.focus();
    }
  }

  return (
    <div className="relative z-20 border-b border-zinc-900 p-3">
      <label htmlFor="workspace-search" className="sr-only">
        Search documents
      </label>
      <div className="flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 transition focus-within:border-sky-700/70 focus-within:ring-1 focus-within:ring-sky-700/30">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-zinc-500"
        >
          <circle
            cx="8.8"
            cy="8.8"
            r="5.8"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="m13.2 13.2 4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          id="workspace-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search your writing..."
          autoComplete="off"
          maxLength={100}
          className="min-w-0 flex-1 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="h-3.5 w-3.5"
            >
              <path
                d="m5 5 10 10M15 5 5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {normalizedQuery && (
        <div
          ref={resultsRef}
          className="absolute inset-x-3 top-full mt-2 max-h-[min(60vh,420px)] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl shadow-black/40"
          role="region"
          aria-label="Search results"
          aria-live="polite"
        >
          {isSearching ? (
            <p className="px-3 py-4 text-center text-xs text-zinc-500">
              Searching your writing…
            </p>
          ) : error ? (
            <p className="px-3 py-4 text-center text-xs text-red-400">{error}</p>
          ) : hasSearched && results.length === 0 ? (
            <div className="px-3 py-5 text-center">
              <p className="text-sm font-medium text-zinc-300">
                No matching documents
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Try another title or phrase in Bengali or English.
              </p>
            </div>
          ) : (
            <>
              <p className="px-2.5 py-2 text-[10px] font-semibold tracking-wider text-zinc-600">
                {results.length === 40
                  ? "TOP 40 MATCHES"
                  : `${results.length} ${results.length === 1 ? "MATCH" : "MATCHES"}`}
              </p>
              {results.map((result, index) => (
                <Link
                  key={result.id}
                  href={`/work/${result.id}`}
                  data-search-result
                  onKeyDown={(event) => handleResultKeyDown(event, index)}
                  className="block rounded-lg px-2.5 py-2 transition hover:bg-zinc-900 focus-visible:bg-zinc-900 focus-visible:outline-none"
                >
                  <span className="block truncate text-xs font-medium text-zinc-200">
                    {result.title || "Untitled"}
                  </span>
                  <span className="mt-1 block truncate text-[10px] text-sky-400/80">
                    {result.folderPath || "Unfiled"}
                  </span>
                  {result.snippet && (
                    <span className="mt-1 block line-clamp-2 text-[11px] leading-4 text-zinc-500">
                      {result.snippet}
                    </span>
                  )}
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
