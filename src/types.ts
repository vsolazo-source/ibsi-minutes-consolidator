export type ItemType = 'discussion' | 'action_item' | 'remark' | 'related';

export interface RawMeetingItem {
  id: string;
  rawText: string;
  timestamp: string;
  type: ItemType;
  title: string;
  expoundedText: string;
  relatedToItemId?: string | null;
  relatedReason?: string | null;
  suggestedOwner?: string | null;
  suggestedDeadline?: string | null;
  priority?: 'High' | 'Medium' | 'Low';
  tags?: string[];
}

export interface MeetingMetadata {
  title: string;
  date: string;
  time: string;
  venue: string;
  attendees: string[];
  purpose: string;
  uploadedMaterialsText?: string;
  uploadedMaterialsFilename?: string;
}

export interface ActionItem {
  id: string;
  task: string;
  assignee: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: string;
}

export interface DiscussionSection {
  topic: string;
  details: string[];
  decisions: string[];
  relatedNotes: string[];
}

export interface ConsolidatedMOM {
  title: string;
  date: string;
  time: string;
  venue: string;
  attendees: string[];
  absentAttendees?: string[];
  executiveSummary: string;
  meetingPurpose: string;
  keyDecisions: string[];
  discussionSections: DiscussionSection[];
  actionItems: ActionItem[];
  otherRemarks: string[];
  nextMeeting?: {
    date?: string;
    time?: string;
    venue?: string;
    agenda?: string;
  };
  revisionNotes?: string;
}

export type MeetingStage = 'setup' | 'capturing' | 'review' | 'finalized';

export interface OutputTypeSelection {
  wordDoc: boolean;
  email: boolean;
  chat: boolean;
}
