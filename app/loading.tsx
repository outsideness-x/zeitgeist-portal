export default function RootLoading() {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-3xl items-center justify-center px-4 py-16">
      <div className="text-center">
        <p className="font-display text-3xl text-ink dark:text-gray-100">Loading</p>
        <p className="mt-2 font-serif text-gray-500 dark:text-gray-400">
          Preparing archive materials...
        </p>
      </div>
    </div>
  );
}
