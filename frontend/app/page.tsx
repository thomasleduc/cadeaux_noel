"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Secret Santa Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Manage your Secret Santa events and send SMS notifications
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/people"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              People
            </h2>
            <p className="text-gray-600">
              Add and manage people participating in Secret Santa
            </p>
          </Link>

          <Link
            href="/families"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Families
            </h2>
            <p className="text-gray-600">
              Create families to prevent matching family members together
            </p>
          </Link>

          <Link
            href="/events"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Events
            </h2>
            <p className="text-gray-600">
              Create and manage Secret Santa events
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
