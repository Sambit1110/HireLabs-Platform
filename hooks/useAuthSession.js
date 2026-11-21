'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

/**
 * Tracks the Supabase session from the local auth cache and auth events.
 * Components read `user` from here instead of calling `auth.getUser()`
 * (a network request) on every interaction.
 */
export function useAuthSession() {
  const [state, setState] = useState({ session: null, ready: false });

  useEffect(() => {
    let supabase;
    try {
      supabase = createClient();
    } catch (error) {
      console.error(error);
      queueMicrotask(() => setState({ session: null, ready: true }));
      return undefined;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ session: data.session, ready: true });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ session, ready: true });
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return {
    session: state.session,
    user: state.session?.user ?? null,
    ready: state.ready,
  };
}
