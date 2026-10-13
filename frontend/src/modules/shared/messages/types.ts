export type MessagePriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';
export type MessageTargetType = 'ALL' | 'ROLE' | 'CLASSROOM' | 'INDIVIDUAL';
export type MessageTargetAudience = 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS' | 'STAFF';

export interface MessageAttachment {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export interface AcademicMessageItem {
  id: string;
  title: string;
  body: string;
  priority: MessagePriority;
  targetType: MessageTargetType;
  targetAudience: MessageTargetAudience;
  classroom?: { id: string; name: string } | null;
  attachments: MessageAttachment[];
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string | null;
  };
  recipientsCount?: number;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    sender?: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
      avatarUrl?: string | null;
    };
  } | null;
  replies?: {
    id: string;
    title: string;
    body: string;
    attachments?: MessageAttachment[];
    createdAt: string;
    sender?: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
      avatarUrl?: string | null;
    };
  }[];
}

export interface InboxItem {
  recipientRecordId: string;
  isRead: boolean;
  readAt?: string | null;
  isStarred?: boolean;
  isArchived: boolean;
  createdAt: string;
  message: AcademicMessageItem;
}

export interface AllowedRecipientsData {
  canBroadcast: boolean;
  canClassroom: boolean;
  canIndividual: boolean;
  classrooms: { id: string; name: string; code?: string }[];
  users: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string | null;
    classroomName?: string;
    childName?: string;
  }[];
}
