"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import Link from "next/link";

type PersonRow = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  phoneNumber?: string | null;
  family?: {
    id: string;
    name: string;
  } | null;
  assistant?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

type FamilyRow = {
  id: string;
  name: string;
};

const GET_PERSONS_AND_FAMILIES = gql`
  query GetPersonsAndFamilies {
    persons {
      id
      firstName
      lastName
      slug
      phoneNumber
      assistant {
        id
        firstName
        lastName
      }
      family {
        id
        name
      }
    }
    families {
      id
      name
    }
  }
`;

const CREATE_PERSON = gql`
  mutation CreatePerson($input: CreatePersonInput!) {
    createPerson(input: $input) {
      id
      firstName
      lastName
      slug
      phoneNumber
    }
  }
`;

const UPDATE_PERSON = gql`
  mutation UpdatePerson($input: UpdatePersonInput!) {
    updatePerson(input: $input) {
      id
      family {
        id
        name
      }
      assistant {
        id
        firstName
        lastName
      }
    }
  }
`;

export default function PeoplePage() {
  const { loading, error, data, refetch } = useQuery<{
    persons: PersonRow[];
    families: FamilyRow[];
  }>(GET_PERSONS_AND_FAMILIES);
  const [createPerson] = useMutation(CREATE_PERSON, {
    onCompleted: () => {
      refetch();
      setShowForm(false);
      resetForm();
    },
  });
  const [updatePerson] = useMutation(UPDATE_PERSON, {
    onCompleted: () => {
      refetch();
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    slug: "",
    phoneNumber: "",
  });
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      slug: "",
      phoneNumber: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPerson({
      variables: {
        input: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          slug: formData.slug,
          phoneNumber: formData.phoneNumber || null,
        },
      },
    });
  };

  const filteredPeople = useMemo(() => {
    const personsList = data?.persons ?? [];
    const filtered =
      familyFilter === "all"
        ? personsList
        : personsList.filter((person) => {
            if (familyFilter === "no-family") {
              return !person.family;
            }
            return person.family?.id === familyFilter;
          });

    return [...filtered].sort((a, b) => {
      if (!a.family && !b.family) {
        return 0;
      }
      if (!a.family) {
        return 1;
      }
      if (!b.family) {
        return -1;
      }
      const compareValue = a.family.name.localeCompare(b.family.name);
      return sortOrder === "asc" ? compareValue : -compareValue;
    });
  }, [data?.persons, familyFilter, sortOrder]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
            >
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">People</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? "Cancel" : "Add Person"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Add New Person</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., john-doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (optional)
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+33612345678"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Person
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-600">
              Total people:{" "}
              <span className="font-medium text-gray-900">
                {filteredPeople.length}
              </span>
            </p>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Family:</label>
                <select
                  value={familyFilter}
                  onChange={(e) => setFamilyFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All families</option>
                  <option value="no-family">No family</option>
                  {data?.families?.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Sort:</label>
                <button
                  onClick={() =>
                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                  }
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {sortOrder === "asc" ? "Family (A → Z)" : "Family (Z → A)"}
                </button>
              </div>
            </div>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Family
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assistant
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPeople.map((person) => (
                <tr key={person.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {person.firstName} {person.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{person.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {person.phoneNumber || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="text-sm text-gray-700 border border-gray-300 rounded-md px-2 py-1 bg-white"
                      value={person.family?.id || ""}
                      onChange={(e) =>
                        updatePerson({
                          variables: {
                            input: {
                              id: person.id,
                              familyId: e.target.value || null,
                            },
                          },
                        })
                      }
                    >
                      <option value="">No family</option>
                      {data?.families?.map((family) => (
                        <option key={family.id} value={family.id}>
                          {family.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="text-sm text-gray-700 border border-gray-300 rounded-md px-2 py-1 bg-white"
                      value={person.assistant?.id || ""}
                      onChange={(e) =>
                        updatePerson({
                          variables: {
                            input: {
                              id: person.id,
                              assistantId: e.target.value || null,
                            },
                          },
                        })
                      }
                    >
                      <option value="">No assistant</option>
                      {data?.persons
                        ?.filter((p) => p.id !== person.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.firstName} {p.lastName}
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.persons?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No people added yet. Click &quot;Add Person&quot; to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
