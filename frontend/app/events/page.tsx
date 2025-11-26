"use client";

import { useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import Link from "next/link";

type PersonSummary = {
  id: string;
  firstName: string;
  lastName: string;
};

type EventRow = {
  id: string;
  name: string;
  smsTemplate: string;
  assistantSmsTemplate: string;
  drawResult: Record<string, string> | null;
  isDryRun: boolean;
  isConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
  participants: PersonSummary[];
};

const GET_EVENTS_AND_PERSONS = gql`
  query GetEventsAndPersons {
    events {
      id
      name
      smsTemplate
      assistantSmsTemplate
      drawResult
      isDryRun
      isConfirmed
      createdAt
      updatedAt
      participants {
        id
        firstName
        lastName
      }
    }
    persons {
      id
      firstName
      lastName
    }
  }
`;

const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      name
    }
  }
`;

const GENERATE_DRAW = gql`
  mutation GenerateDraw($eventId: ID!, $isDryRun: Boolean) {
    generateDraw(eventId: $eventId, isDryRun: $isDryRun) {
      id
      drawResult
      isDryRun
      isConfirmed
    }
  }
`;

const CONFIRM_DRAW = gql`
  mutation ConfirmDraw($eventId: ID!) {
    confirmDraw(eventId: $eventId) {
      id
      isConfirmed
    }
  }
`;

const ADD_PERSON_TO_EVENT = gql`
  mutation AddPersonToEvent($eventId: ID!, $personId: ID!) {
    addPersonToEvent(eventId: $eventId, personId: $personId) {
      id
      participants {
        id
        firstName
        lastName
      }
    }
  }
`;

const REMOVE_PERSON_FROM_EVENT = gql`
  mutation RemovePersonFromEvent($eventId: ID!, $personId: ID!) {
    removePersonFromEvent(eventId: $eventId, personId: $personId) {
      id
      participants {
        id
        firstName
        lastName
      }
    }
  }
`;

const DEFAULT_SMS_TEMPLATE =
  "Hello {sender}, this is Santa Claus. This year you should give a gift to {receiver}.";
const DEFAULT_ASSISTANT_TEMPLATE =
  "Hello {assistant}, this is Santa Claus. This year {sender} should give a gift to {receiver}.";

export default function EventsPage() {
  const { loading, error, data, refetch } = useQuery<{
    events: EventRow[];
    persons: PersonSummary[];
  }>(GET_EVENTS_AND_PERSONS);

  const [createEvent] = useMutation(CREATE_EVENT, {
    onCompleted: () => {
      refetch();
      setShowForm(false);
      resetForm();
    },
  });

  const [generateDraw] = useMutation(GENERATE_DRAW, {
    onCompleted: () => {
      refetch();
      setActionState({ type: null });
    },
    onError: () => setActionState({ type: null }),
  });

  const [confirmDraw] = useMutation(CONFIRM_DRAW, {
    onCompleted: () => {
      refetch();
      setActionState({ type: null });
    },
    onError: () => setActionState({ type: null }),
  });
  const [addPersonToEventMutation] = useMutation(ADD_PERSON_TO_EVENT);
  const [removePersonFromEventMutation] = useMutation(REMOVE_PERSON_FROM_EVENT);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    smsTemplate: DEFAULT_SMS_TEMPLATE,
    assistantSmsTemplate: DEFAULT_ASSISTANT_TEMPLATE,
  });
  const [actionState, setActionState] = useState<{
    type: "generate" | "confirm" | "toggle" | null;
    eventId?: string;
    personId?: string;
  }>({ type: null });

  const resetForm = () => {
    setFormData({
      name: "",
      smsTemplate: DEFAULT_SMS_TEMPLATE,
      assistantSmsTemplate: DEFAULT_ASSISTANT_TEMPLATE,
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return;
    }
    createEvent({
      variables: {
        input: {
          name: formData.name.trim(),
          smsTemplate: formData.smsTemplate,
          assistantSmsTemplate: formData.assistantSmsTemplate,
        },
      },
    });
  };

  const handleGenerate = (eventId: string, isDryRun: boolean) => {
    setActionState({ type: "generate", eventId });
    generateDraw({
      variables: { eventId, isDryRun },
    });
  };

  const handleConfirm = (eventId: string) => {
    setActionState({ type: "confirm", eventId });
    confirmDraw({
      variables: { eventId },
    });
  };

  const handleToggleParticipant = async (
    eventId: string,
    personId: string,
    shouldAdd: boolean
  ) => {
    setActionState({ type: "toggle", eventId, personId });
    try {
      if (shouldAdd) {
        await addPersonToEventMutation({
          variables: { eventId, personId },
        });
      } else {
        await removePersonFromEventMutation({
          variables: { eventId, personId },
        });
      }
      await refetch();
    } finally {
      setActionState({ type: null });
    }
  };

  const handleSelectAll = async (eventId: string) => {
    const event = data?.events?.find((e) => e.id === eventId);
    if (!event || !data?.persons) return;

    const participantIds = new Set(event.participants?.map((p) => p.id) ?? []);
    const allPersons = data.persons;
    const allSelected = allPersons.every((p) => participantIds.has(p.id));

    setActionState({ type: "toggle", eventId });
    try {
      if (allSelected) {
        // Deselect all
        for (const person of allPersons) {
          if (participantIds.has(person.id)) {
            await removePersonFromEventMutation({
              variables: { eventId, personId: person.id },
            });
          }
        }
      } else {
        // Select all
        for (const person of allPersons) {
          if (!participantIds.has(person.id)) {
            await addPersonToEventMutation({
              variables: { eventId, personId: person.id },
            });
          }
        }
      }
      await refetch();
    } finally {
      setActionState({ type: null });
    }
  };

  const getPersonName = (personId: string) => {
    const person = data?.persons?.find((p) => p.id === personId);
    return person ? `${person.firstName} ${person.lastName}` : personId;
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
            <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? "Cancel" : "Create Event"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Create New Event</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder='e.g., "Christmas 2025"'
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMS Template
                </label>
                <textarea
                  required
                  value={formData.smsTemplate}
                  onChange={(e) =>
                    setFormData({ ...formData, smsTemplate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available placeholders: {"{sender}"}, {"{receiver}"}.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assistant SMS Template
                </label>
                <textarea
                  required
                  value={formData.assistantSmsTemplate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assistantSmsTemplate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available placeholders: {"{assistant}"}, {"{sender}"},{" "}
                  {"{receiver}"}.
                </p>
              </div>

              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Event
              </button>
            </form>
          </div>
        )}

        {data?.events?.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-white rounded-lg shadow">
            No events yet. Click &quot;Create Event&quot; to add one.
          </div>
        ) : (
          <div className="space-y-6">
            {data?.events?.map((event) => {
              const isGenerating =
                actionState.type === "generate" &&
                actionState.eventId === event.id;
              const isConfirming =
                actionState.type === "confirm" &&
                actionState.eventId === event.id;
              const isToggling =
                actionState.type === "toggle" && actionState.eventId === event.id;
              const togglingPersonId = isToggling ? actionState.personId : undefined;
              const participantIds = new Set(
                (event.participants || []).map((participant) => participant.id)
              );
              const availablePersons =
                data?.persons?.filter((person) => !participantIds.has(person.id)) ?? [];
              const canDraw = (event.participants?.length ?? 0) >= 2;

              return (
                <div key={event.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900">
                        {event.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Created {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full ${
                          event.isDryRun
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {event.isDryRun ? "Last draw: dry-run" : "Final draw"}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full ${
                          event.isConfirmed
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {event.isConfirmed ? "Confirmed" : "Not confirmed"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">
                        SMS Template
                      </h3>
                      <pre className="bg-gray-50 text-gray-800 rounded-md p-3 text-sm whitespace-pre-wrap">
                        {event.smsTemplate}
                      </pre>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">
                        Assistant SMS Template
                      </h3>
                      <pre className="bg-gray-50 text-gray-800 rounded-md p-3 text-sm whitespace-pre-wrap">
                        {event.assistantSmsTemplate}
                      </pre>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      Participants
                    </h3>
                    {data?.persons && data.persons.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                          <p className="text-xs text-gray-600">
                            Participants selected:{" "}
                            <span className="font-medium text-gray-900">
                              {event.participants?.length ?? 0}
                            </span>{" "}
                            /{" "}
                            <span className="font-medium text-gray-900">
                              {data.persons.length}
                            </span>
                          </p>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-gray-500">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    checked={
                                      data?.persons &&
                                      data.persons.length > 0 &&
                                      data.persons.every((p) =>
                                        participantIds.has(p.id)
                                      )
                                    }
                                    disabled={
                                      isToggling &&
                                      actionState.type === "toggle" &&
                                      actionState.eventId === event.id
                                    }
                                    onChange={() => handleSelectAll(event.id)}
                                  />
                                  <span>Include</span>
                                </div>
                              </th>
                              <th className="px-4 py-2 text-left font-medium text-gray-500">
                                Person
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {data.persons.map((person) => {
                              const checked = participantIds.has(person.id);
                              const disabled =
                                isToggling && togglingPersonId !== undefined
                                  ? togglingPersonId !== person.id
                                  : false;
                              return (
                                <tr key={person.id}>
                                  <td className="px-4 py-2">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                      checked={checked}
                                      disabled={disabled}
                                      onChange={(e) =>
                                        handleToggleParticipant(
                                          event.id,
                                          person.id,
                                          e.target.checked
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="px-4 py-2 text-gray-800">
                                    {person.firstName} {person.lastName}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No people available. Add people first from the People page.
                      </p>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      Checking a person adds them to this event&apos;s draw pool.
                      Unchecking removes them.
                    </p>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      Draw Result
                    </h3>
                    {event.drawResult ? (
                      <div className="bg-gray-50 rounded-md p-3 space-y-1">
                        {Object.entries(event.drawResult).map(
                          ([senderId, receiverId]) => (
                            <div
                              key={`${senderId}-${receiverId}`}
                              className="text-sm text-gray-800 flex items-center gap-2"
                            >
                              <span className="font-medium">
                                {getPersonName(senderId)}
                              </span>
                              <span className="text-gray-500">→</span>
                              <span>{getPersonName(receiverId)}</span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No draw yet. Generate one to see assignments.
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => handleGenerate(event.id, true)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
                      disabled={isGenerating || !canDraw}
                    >
                      {isGenerating ? "Generating..." : "Dry-run draw"}
                    </button>
                    <button
                      onClick={() => handleGenerate(event.id, false)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60"
                      disabled={isGenerating || !canDraw}
                    >
                      {isGenerating ? "Generating..." : "Final draw"}
                    </button>
                    <button
                      onClick={() => handleConfirm(event.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                      disabled={isConfirming || !event.drawResult || event.isConfirmed}
                    >
                      {isConfirming ? "Confirming..." : "Confirm draw"}
                    </button>
                    {!canDraw && (
                      <p className="text-sm text-gray-500 mt-2">
                        Need at least two participants to run a draw.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

