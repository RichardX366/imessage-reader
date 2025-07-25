import '@/styles/globals.css';
import '@mantine/core/styles.css';
import { WorkerContext } from '@/helpers/sql';
import type { AppProps } from 'next/app';
import { MantineProvider } from '@mantine/core';
import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    setWorker(
      new Worker(new URL('../worker.ts', import.meta.url), {
        type: 'module',
      }),
    );
  }, []);

  return (
    <WorkerContext.Provider value={worker}>
      <MantineProvider>
        <Head>
          <title>iMessage Reader</title>
        </Head>
        <Component {...pageProps} />
      </MantineProvider>
    </WorkerContext.Provider>
  );
}
