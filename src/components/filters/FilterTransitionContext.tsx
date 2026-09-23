"use client";

import React, { createContext, useContext, useTransition } from "react";

interface FilterTransitionContextValue {
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
}

const FilterTransitionContext = createContext<FilterTransitionContextValue>({
  isPending: false,
  startTransition: (fn) => fn(),
});

export function FilterTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <FilterTransitionContext.Provider value={{ isPending, startTransition }}>
      {children}
    </FilterTransitionContext.Provider>
  );
}

export function useFilterTransition() {
  return useContext(FilterTransitionContext);
}
