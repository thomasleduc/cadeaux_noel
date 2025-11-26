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

type EventStatus = "draft" | "ready" | "drawn" | "completed";

type EventRow = {
  id: string;
  name: string;
  smsTemplate: string;
  assistantSmsTemplate: string;
  drawResult: Record<string, string> | null;
  status: EventStatus | null;
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
      status
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

const MARK_EVENT_AS_READY = gql`
  mutation MarkEventAsReady($eventId: ID!) {
    markEventAsReady(eventId: $eventId) {
      id
      status
    }
  }
`;

const GENERATE_DRAW = gql`
  mutation GenerateDraw($eventId: ID!) {
    generateDraw(eventId: $eventId) {
      id
      drawResult
      status
    }
  }
`;

const MARK_EVENT_AS_COMPLETED = gql`
  mutation MarkEventAsCompleted($eventId: ID!) {
    markEventAsCompleted(eventId: $eventId) {
      id
      status
    }
  }
`;

const DRY_RUN_SMS = gql`
  mutation DryRunSms($eventId: ID!) {
    dryRunSms(eventId: $eventId) {
      messages {
        to
        toName
        sender
        receiver
        message
        type
        error
      }
      summary {
        total
        success
        failed
      }
    }
  }
`;

const RESEND_EVENT_SMS = gql`
  mutation ResendEventSms($eventId: ID!) {
    resendEventSms(eventId: $eventId)
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

const UPDATE_EVENT = gql`
  mutation UpdateEvent($input: UpdateEventInput!) {
    updateEvent(input: $input) {
      id
      name
      smsTemplate
      assistantSmsTemplate
      status
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

  const [markAsReady] = useMutation(MARK_EVENT_AS_READY, {
    onCompleted: () => {
      refetch();
      setActionState({ type: null });
    },
    onError: () => setActionState({ type: null }),
  });

  const [generateDraw] = useMutation(GENERATE_DRAW, {
    onCompleted: () => {
      refetch();
      setActionState({ type: null });
    },
    onError: () => setActionState({ type: null }),
  });

  const [markAsCompleted] = useMutation(MARK_EVENT_AS_COMPLETED, {
    onCompleted: () => {
      refetch();
      setActionState({ type: null });
    },
    onError: () => setActionState({ type: null }),
  });

  const [dryRunSms] = useMutation(DRY_RUN_SMS);

  const [resendSms] = useMutation(RESEND_EVENT_SMS, {
    onCompleted: () => {
      refetch();
      setActionState({ type: null });
    },
    onError: () => setActionState({ type: null }),
  });
  const [addPersonToEventMutation] = useMutation(ADD_PERSON_TO_EVENT);
  const [removePersonFromEventMutation] = useMutation(REMOVE_PERSON_FROM_EVENT);
  const [updateEventMutation] = useMutation(UPDATE_EVENT);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    smsTemplate: DEFAULT_SMS_TEMPLATE,
    assistantSmsTemplate: DEFAULT_ASSISTANT_TEMPLATE,
  });
  const [actionState, setActionState] = useState<{
    type:
      | "ready"
      | "generate"
      | "complete"
      | "toggle"
      | "dryRun"
      | "resend"
      | null;
    eventId?: string;
    personId?: string;
  }>({ type: null });
  const [editingTemplate, setEditingTemplate] = useState<{
    eventId: string;
    field: "smsTemplate" | "assistantSmsTemplate";
  } | null>(null);
  const [editingTemplateValue, setEditingTemplateValue] = useState("");
  const [dryRunResult, setDryRunResult] = useState<{
    eventId: string;
    messages: Array<{
      to: string;
      toName: string;
      sender: string;
      receiver: string;
      message: string;
      type: string;
      error?: string;
    }>;
    summary: {
      total: number;
      success: number;
      failed: number;
    };
  } | null>(null);

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

  const handleMarkAsReady = (eventId: string) => {
    setActionState({ type: "ready", eventId });
    markAsReady({
      variables: { eventId },
    });
  };

  const handleGenerate = (eventId: string) => {
    setActionState({ type: "generate", eventId });
    generateDraw({
      variables: { eventId },
    });
  };

  const handleMarkAsCompleted = (eventId: string) => {
    setActionState({ type: "complete", eventId });
    markAsCompleted({
      variables: { eventId },
    });
  };

  const handleDryRunSms = async (eventId: string) => {
    setActionState({ type: "dryRun", eventId });
    try {
      const result = await dryRunSms({
        variables: { eventId },
      });
      if (result.data?.dryRunSms) {
        setDryRunResult({
          eventId,
          ...result.data.dryRunSms,
        });
      }
    } catch (error) {
      console.error("Dry-run SMS failed:", error);
    } finally {
      setActionState({ type: null });
    }
  };

  const handleResendSms = (eventId: string) => {
    setActionState({ type: "resend", eventId });
    resendSms({
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

  const startEditingTemplate = (
    eventId: string,
    field: "smsTemplate" | "assistantSmsTemplate",
    currentValue: string
  ) => {
    setEditingTemplate({ eventId, field });
    setEditingTemplateValue(currentValue);
  };

  const cancelEditingTemplate = () => {
    setEditingTemplate(null);
    setEditingTemplateValue("");
  };

  const saveEditingTemplate = async () => {
    if (!editingTemplate) return;

    const value = editingTemplateValue.trim();
    if (value.length === 0) {
      cancelEditingTemplate();
      return;
    }

    try {
      await updateEventMutation({
        variables: {
          input: {
            id: editingTemplate.eventId,
            [editingTemplate.field]: value,
          },
        },
      });
      await refetch();
      cancelEditingTemplate();
    } catch (error) {
      console.error("Failed to update template:", error);
      cancelEditingTemplate();
    }
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
                  Available placeholders: {"{sender}"}, {"{sender.firstName}"},{" "}
                  {"{sender.lastName}"}, {"{sender.slug}"}, {"{receiver}"},{" "}
                  {"{receiver.firstName}"}, {"{receiver.lastName}"},{" "}
                  {"{receiver.slug}"}.
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
                  Available placeholders: {"{assistant}"},{" "}
                  {"{assistant.firstName}"}, {"{assistant.lastName}"},{" "}
                  {"{assistant.slug}"}, {"{sender}"}, {"{sender.firstName}"},{" "}
                  {"{sender.lastName}"}, {"{sender.slug}"}, {"{receiver}"},{" "}
                  {"{receiver.firstName}"}, {"{receiver.lastName}"},{" "}
                  {"{receiver.slug}"}.
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
              const isMarkingReady =
                actionState.type === "ready" &&
                actionState.eventId === event.id;
              const isGenerating =
                actionState.type === "generate" &&
                actionState.eventId === event.id;
              const isCompleting =
                actionState.type === "complete" &&
                actionState.eventId === event.id;
              const isToggling =
                actionState.type === "toggle" &&
                actionState.eventId === event.id;
              const togglingPersonId = isToggling
                ? actionState.personId
                : undefined;
              const participantIds = new Set(
                (event.participants || []).map((participant) => participant.id)
              );
              const availablePersons =
                data?.persons?.filter(
                  (person) => !participantIds.has(person.id)
                ) ?? [];
              const canMarkReady = (event.participants?.length ?? 0) >= 2;

              const getStatusBadge = (status: EventStatus | null) => {
                // Normalize status to lowercase (GraphQL returns uppercase enum values)
                const rawStatus = status || "DRAFT";
                const effectiveStatus =
                  typeof rawStatus === "string"
                    ? rawStatus.toLowerCase()
                    : "draft";
                const badges = {
                  draft: "bg-gray-100 text-gray-800",
                  ready: "bg-blue-100 text-blue-800",
                  drawn: "bg-purple-100 text-purple-800",
                  completed: "bg-green-100 text-green-800",
                };
                const labels = {
                  draft: "Draft",
                  ready: "Ready",
                  drawn: "Drawn",
                  completed: "Completed",
                };
                return (
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${badges[effectiveStatus]}`}
                  >
                    {labels[effectiveStatus]}
                  </span>
                );
              };

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
                    <div className="flex flex-wrap gap-2 items-center">
                      {getStatusBadge(event.status)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">
                        SMS Template
                      </h3>
                      <div className="relative group">
                        {editingTemplate?.eventId === event.id &&
                        editingTemplate?.field === "smsTemplate" ? (
                          <textarea
                            value={editingTemplateValue}
                            onChange={(e) =>
                              setEditingTemplateValue(e.target.value)
                            }
                            onBlur={saveEditingTemplate}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.ctrlKey) {
                                saveEditingTemplate();
                              } else if (e.key === "Escape") {
                                cancelEditingTemplate();
                              }
                            }}
                            autoFocus
                            className="w-full bg-gray-50 text-gray-800 rounded-md p-3 text-sm border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                          />
                        ) : (
                          <div className="relative">
                            <pre className="bg-gray-50 text-gray-800 rounded-md p-3 text-sm whitespace-pre-wrap">
                              {event.smsTemplate}
                            </pre>
                            <button
                              onClick={() =>
                                startEditingTemplate(
                                  event.id,
                                  "smsTemplate",
                                  event.smsTemplate
                                )
                              }
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit template"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Available placeholders: {"{sender}"},{" "}
                        {"{sender.firstName}"}, {"{sender.lastName}"},{" "}
                        {"{sender.slug}"}, {"{receiver}"},{" "}
                        {"{receiver.firstName}"}, {"{receiver.lastName}"},{" "}
                        {"{receiver.slug}"}. Press Ctrl+Enter to save, Esc to
                        cancel.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">
                        Assistant SMS Template
                      </h3>
                      <div className="relative group">
                        {editingTemplate?.eventId === event.id &&
                        editingTemplate?.field === "assistantSmsTemplate" ? (
                          <textarea
                            value={editingTemplateValue}
                            onChange={(e) =>
                              setEditingTemplateValue(e.target.value)
                            }
                            onBlur={saveEditingTemplate}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.ctrlKey) {
                                saveEditingTemplate();
                              } else if (e.key === "Escape") {
                                cancelEditingTemplate();
                              }
                            }}
                            autoFocus
                            className="w-full bg-gray-50 text-gray-800 rounded-md p-3 text-sm border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                          />
                        ) : (
                          <div className="relative">
                            <pre className="bg-gray-50 text-gray-800 rounded-md p-3 text-sm whitespace-pre-wrap">
                              {event.assistantSmsTemplate}
                            </pre>
                            <button
                              onClick={() =>
                                startEditingTemplate(
                                  event.id,
                                  "assistantSmsTemplate",
                                  event.assistantSmsTemplate
                                )
                              }
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit template"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Available placeholders: {"{assistant}"},{" "}
                        {"{assistant.firstName}"}, {"{assistant.lastName}"},{" "}
                        {"{assistant.slug}"}, {"{sender}"},{" "}
                        {"{sender.firstName}"}, {"{sender.lastName}"},{" "}
                        {"{sender.slug}"}, {"{receiver}"},{" "}
                        {"{receiver.firstName}"}, {"{receiver.lastName}"},{" "}
                        {"{receiver.slug}"}. Press Ctrl+Enter to save, Esc to
                        cancel.
                      </p>
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
                        No people available. Add people first from the People
                        page.
                      </p>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      Checking a person adds them to this event&apos;s draw
                      pool. Unchecking removes them.
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

                  <div className="mt-6 flex flex-wrap gap-3 items-center">
                    {(() => {
                      // Normalize status to lowercase (GraphQL returns uppercase enum values)
                      const rawStatus = event.status || "DRAFT";
                      const currentStatus =
                        typeof rawStatus === "string"
                          ? rawStatus.toLowerCase()
                          : "draft";

                      if (currentStatus === "draft") {
                        return (
                          <>
                            <button
                              onClick={() => handleMarkAsReady(event.id)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                              disabled={isMarkingReady || !canMarkReady}
                            >
                              {isMarkingReady
                                ? "Marking as ready..."
                                : "Mark as Ready"}
                            </button>
                            {!canMarkReady && (
                              <p className="text-sm text-gray-500">
                                Need at least two participants to mark event as
                                ready.
                              </p>
                            )}
                          </>
                        );
                      }
                      if (currentStatus === "ready") {
                        return (
                          <button
                            onClick={() => handleGenerate(event.id)}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60"
                            disabled={isGenerating}
                          >
                            {isGenerating
                              ? "Generating draw..."
                              : "Generate Draw"}
                          </button>
                        );
                      }
                      if (currentStatus === "drawn") {
                        const isDryRunning =
                          actionState.type === "dryRun" &&
                          actionState.eventId === event.id;
                        return (
                          <>
                            <button
                              onClick={() => handleGenerate(event.id)}
                              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60"
                              disabled={isGenerating}
                            >
                              {isGenerating
                                ? "Regenerating draw..."
                                : "Regenerate Draw"}
                            </button>
                            <button
                              onClick={() => handleDryRunSms(event.id)}
                              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-60"
                              disabled={isDryRunning}
                            >
                              {isDryRunning
                                ? "Running dry-run..."
                                : "Dry-run SMS"}
                            </button>
                            <button
                              onClick={() => handleMarkAsCompleted(event.id)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                              disabled={isCompleting}
                            >
                              {isCompleting
                                ? "Completing..."
                                : "Mark as Completed (Send SMS)"}
                            </button>
                          </>
                        );
                      }
                      if (currentStatus === "completed") {
                        const isResending =
                          actionState.type === "resend" &&
                          actionState.eventId === event.id;
                        return (
                          <div className="flex flex-wrap gap-3 items-center">
                            <p className="text-sm text-green-600 font-medium">
                              ✓ Event completed - SMS have been sent
                            </p>
                            <button
                              onClick={() => handleResendSms(event.id)}
                              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-60"
                              disabled={isResending}
                            >
                              {isResending ? "Resending SMS..." : "Resend SMS"}
                            </button>
                          </div>
                        );
                      }
                      // Fallback - should never happen but just in case
                      return (
                        <div className="text-sm text-gray-500">
                          <p>Status: {currentStatus || "unknown"}</p>
                          <button
                            onClick={() => handleMarkAsReady(event.id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 mt-2"
                            disabled={isMarkingReady || !canMarkReady}
                          >
                            {isMarkingReady
                              ? "Marking as ready..."
                              : "Mark as Ready"}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dry-run SMS Results Modal */}
        {dryRunResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Dry-run SMS Results
                  </h2>
                  <button
                    onClick={() => setDryRunResult(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total:</span>{" "}
                      <span className="font-semibold text-gray-900">
                        {dryRunResult.summary.total}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Success:</span>{" "}
                      <span className="font-semibold text-green-600">
                        {dryRunResult.summary.success}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Failed:</span>{" "}
                      <span className="font-semibold text-red-600">
                        {dryRunResult.summary.failed}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {dryRunResult.messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        msg.error
                          ? "border-red-200 bg-red-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            To: {msg.toName} ({msg.to})
                          </div>
                          <div className="text-xs text-gray-600 mb-2">
                            Type:{" "}
                            {msg.type === "assistant"
                              ? "Assistant SMS"
                              : "Regular SMS"}
                          </div>
                          <div className="text-sm text-gray-700 mb-1">
                            <span className="font-medium">Sender:</span>{" "}
                            {msg.sender}
                          </div>
                          <div className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Receiver:</span>{" "}
                            {msg.receiver}
                          </div>
                          {msg.error && (
                            <div className="text-sm text-red-600 font-medium mb-2">
                              Error: {msg.error}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">
                          Message:
                        </div>
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-2 rounded border">
                          {msg.message || "(No message - error occurred)"}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setDryRunResult(null)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
