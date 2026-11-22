"use client";

import { useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import Link from "next/link";

const PencilIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4"
  >
    <path d="M15.586 2.586a2 2 0 0 0-2.828 0L2 13.344V18h4.656L17.414 7.242a2 2 0 0 0 0-2.828l-1.828-1.828Zm-2.121.707 1.828 1.828-1 1-1.828-1.828 1-1Zm-2.414 2.414 1.828 1.828L6 14.586H4v-2l7.051-6.879Z" />
  </svg>
);

const GET_FAMILIES = gql`
  query GetFamilies {
    families {
      id
      name
      members {
        id
        firstName
        lastName
      }
    }
  }
`;

type FamilyRow = {
  id: string;
  name: string;
  members: { id: string; firstName: string; lastName: string }[];
};

const CREATE_FAMILY = gql`
  mutation CreateFamily($input: CreateFamilyInput!) {
    createFamily(input: $input) {
      id
      name
    }
  }
`;

const UPDATE_FAMILY = gql`
  mutation UpdateFamily($input: UpdateFamilyInput!) {
    updateFamily(input: $input) {
      id
      name
    }
  }
`;

export default function FamiliesPage() {
  const { loading, error, data, refetch } = useQuery<{ families: FamilyRow[] }>(GET_FAMILIES);
  const [createFamily] = useMutation(CREATE_FAMILY, {
    onCompleted: () => {
      refetch();
      setShowForm(false);
      setFamilyName("");
    },
  });
  const [updateFamily] = useMutation(UPDATE_FAMILY, {
    onCompleted: () => {
      refetch();
      setEditingFamilyId(null);
      setEditingValue("");
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) {
      return;
    }
    createFamily({
      variables: {
        input: {
          name: familyName.trim(),
        },
      },
    });
  };

  const startEditingFamily = (familyId: string, currentName: string) => {
    setEditingFamilyId(familyId);
    setEditingValue(currentName);
  };

  const cancelEditingFamily = () => {
    setEditingFamilyId(null);
    setEditingValue("");
  };

  const saveFamilyName = async () => {
    if (!editingFamilyId) return;
    const trimmed = editingValue.trim();
    if (!trimmed) {
      cancelEditingFamily();
      return;
    }
    await updateFamily({
      variables: {
        input: {
          id: editingFamilyId,
          name: trimmed,
        },
      },
    });
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Families</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? "Cancel" : "Add Family"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Add New Family</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Family Name
                </label>
                <input
                  type="text"
                  required
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Martin Family"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Family
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Members
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.families?.map((family: any) => (
                <tr key={family.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingFamilyId === family.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={saveFamilyName}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            (e.currentTarget as HTMLInputElement).blur();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            cancelEditingFamily();
                          }
                        }}
                        className="w-full border border-blue-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="group flex items-center gap-2 text-sm font-medium text-gray-900">
                        <span>{family.name}</span>
                        <button
                          type="button"
                          aria-label="Edit family name"
                          className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => startEditingFamily(family.id, family.name)}
                        >
                          <PencilIcon />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {family.members.length === 0 ? (
                      <div className="text-sm text-gray-500">No members yet</div>
                    ) : (
                      <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                        {family.members.map((member: any) => (
                          <li key={member.id}>
                            {member.firstName} {member.lastName}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.families?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No families added yet. Click "Add Family" to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

