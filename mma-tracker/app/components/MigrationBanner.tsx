'use client';

interface MigrationBannerProps {
  migrationNeeded: boolean;
  migrating: boolean;
  migrationResult: { success: boolean; migratedCount: number; errors: string[] } | null;
  onMigrate: () => void;
  onDismiss: () => void;
}

export default function MigrationBanner({
  migrationNeeded,
  migrating,
  migrationResult,
  onMigrate,
  onDismiss,
}: MigrationBannerProps) {
  if (!migrationNeeded && !migrationResult) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1">
          {migrating ? (
            <p className="font-medium">Migrating your training data to the cloud...</p>
          ) : migrationResult ? (
            migrationResult.success ? (
              <p className="font-medium">
                ✅ Successfully migrated {migrationResult.migratedCount} sessions to the cloud!
              </p>
            ) : (
              <p className="font-medium">
                ⚠️ Migration failed. Please try again or contact support.
              </p>
            )
          ) : (
            <p className="font-medium">
              📱 Migrate your training data to access it on any device!
            </p>
          )}
        </div>

        {!migrating && !migrationResult && (
          <div className="flex gap-2">
            <button
              onClick={onMigrate}
              className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Migrate Now
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              Later
            </button>
          </div>
        )}

        {migrationResult && (
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
