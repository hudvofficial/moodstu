export default function SettingsLoading() {
  return (
    <div className="main-container pb-28 lg:pb-12" aria-busy="true" aria-label="Đang tải cài đặt">
      <div className="detail-grid animate-pulse">
        <div className="detail-main">
          <div className="card-base p-4 lg:p-6">
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-full bg-bg-hover" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 rounded bg-bg-hover" />
                <div className="h-3 w-48 max-w-full rounded bg-bg-hover" />
              </div>
              <div className="size-9 rounded-lg bg-bg-hover" />
            </div>
          </div>

          <div className="card-base p-4 lg:p-6">
            <div className="mb-4 h-4 w-36 rounded bg-bg-hover" />
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex min-h-12 items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="size-5 rounded bg-bg-hover" />
                  <div className="h-4 w-32 rounded bg-bg-hover" />
                </div>
                <div className="h-[31px] w-[51px] rounded-full bg-bg-hover" />
              </div>
            ))}
          </div>

          <div className="card-base p-4 lg:p-6 space-y-3">
            <div className="h-4 w-24 rounded bg-bg-hover" />
            <div className="h-3 w-full rounded bg-bg-hover" />
            <div className="h-3 w-3/4 rounded bg-bg-hover" />
          </div>
        </div>

        <div className="detail-sidebar flex!">
          <div className="card-base p-4 lg:p-6">
            <div className="mb-4 h-4 w-40 rounded bg-bg-hover" />
            {[...Array(3)].map((_, index) => (
              <div key={index} className="mb-2 h-11 rounded-lg bg-bg-hover" />
            ))}
          </div>
          <div className="card-base p-4 lg:p-6 space-y-3">
            <div className="h-4 w-32 rounded bg-bg-hover" />
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-center gap-3 py-2">
                <div className="size-10 rounded-full bg-bg-hover" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 rounded bg-bg-hover" />
                  <div className="h-3 w-40 max-w-full rounded bg-bg-hover" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
