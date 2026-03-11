import { useCallback, useEffect, useRef } from "react";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { parseSkillsFindOutput } from "../../../lib/skills";
import { useAppStore } from "../../../store/appStore";
import { skillsClient } from "../../../shared/services/skillsClient";

export function useSkillSearch() {
  const { searchQuery, searchStatus, searchResults, searchError, history, addHistory, setSearchQuery, setSearchResults, setSearchStatus } =
    useAppStore();
  const latestSearchRequestRef = useRef(0);
  const lastSearchedQueryRef = useRef("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim(), 350);

  const runSearch = useCallback(
    async (query: string, force = false) => {
      const trimmed = query.trim();
      if (!trimmed) {
        latestSearchRequestRef.current += 1;
        lastSearchedQueryRef.current = "";
        setSearchResults([]);
        setSearchStatus("idle");
        return;
      }

      if (!force && trimmed === lastSearchedQueryRef.current) {
        return;
      }

      const requestId = ++latestSearchRequestRef.current;
      lastSearchedQueryRef.current = trimmed;
      setSearchStatus("loading");
      try {
        const output = await skillsClient.search(`search-${requestId}-${Date.now()}`, trimmed);
        if (requestId !== latestSearchRequestRef.current) {
          return;
        }
        const parsed = parseSkillsFindOutput(output);
        setSearchResults(parsed);
        setSearchStatus("idle");
        await addHistory(trimmed);
      } catch (error) {
        if (requestId !== latestSearchRequestRef.current) {
          return;
        }
        setSearchStatus("error", String(error));
      }
    },
    [addHistory, setSearchResults, setSearchStatus],
  );

  useEffect(() => {
    void runSearch(debouncedSearchQuery);
  }, [debouncedSearchQuery, runSearch]);

  return {
    searchQuery,
    searchStatus,
    searchResults,
    searchError,
    history,
    setSearchQuery,
    runSearch,
  };
}
