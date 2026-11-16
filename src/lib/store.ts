import { create } from 'zustand';
import { DocType, GoalId, ExtractedDocument, Finding, FixStep } from './rules/types';

export type Language = 'en' | 'hi' | 'mr';

export interface DocumentSlotState {
  status: 'empty' | 'ready' | 'reading' | 'done' | 'failed';
  file?: File;
  fileObjectUrl?: string;
  extracted?: ExtractedDocument;
  userConfirmedFields: string[]; // e.g. 'aadhaar.fullName'
  error?: string;
}

export interface AppState {
  language: Language;
  goalId: GoalId | null;
  consentAccepted: boolean;
  isDemoMode: boolean;
  demoScenarioId: string | null;
  isMockDataUsed: boolean;
  documents: Partial<Record<DocType, DocumentSlotState>>;
  findings: Finding[];
  fixPlan: FixStep[];
  correctVersionChoice: Record<string, DocType>; // findingId -> chosen docType

  // Actions
  setLanguage: (lang: Language) => void;
  setGoalId: (goal: GoalId) => void;
  setConsentAccepted: (accepted: boolean) => void;
  setDemoMode: (isDemo: boolean, scenarioId?: string) => void;
  setMockDataUsed: (used: boolean) => void;
  setDocumentFile: (docType: DocType, file: File, objectUrl: string) => void;
  setDocumentReading: (docType: DocType) => void;
  setDocumentExtracted: (docType: DocType, extracted: ExtractedDocument) => void;
  setDocumentError: (docType: DocType, error: string) => void;
  removeDocument: (docType: DocType) => void;
  updateExtractedField: (docType: DocType, fieldName: string, value: any) => void;
  confirmField: (docType: DocType, fieldName: string) => void;
  setReport: (findings: Finding[], fixPlan: FixStep[]) => void;
  setCorrectVersionChoice: (findingId: string, doc: DocType) => void;
  clearAllData: () => void;
}

const initialDocuments: Partial<Record<DocType, DocumentSlotState>> = {};

export const useAppStore = create<AppState>((set, get) => ({
  language: 'en',
  goalId: null,
  consentAccepted: false,
  isDemoMode: false,
  demoScenarioId: null,
  isMockDataUsed: false,
  documents: initialDocuments,
  findings: [],
  fixPlan: [],
  correctVersionChoice: {},

  setLanguage: (language) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pechansetu_lang', language);
    }
    set({ language });
  },

  setGoalId: (goalId) => {
    const current = get().goalId;
    if (current !== goalId) {
      // Clear documents and findings when goal changes or starting a new run
      const docs = get().documents;
      for (const d of Object.values(docs)) {
        if (d?.fileObjectUrl) {
          URL.revokeObjectURL(d.fileObjectUrl);
        }
      }
      set({
        goalId,
        documents: {},
        findings: [],
        fixPlan: [],
        correctVersionChoice: {},
      });
    } else {
      set({ goalId });
    }
  },

  setConsentAccepted: (consentAccepted) => set({ consentAccepted }),

  setDemoMode: (isDemoMode, scenarioId) =>
    set({ isDemoMode, demoScenarioId: scenarioId || null }),

  setMockDataUsed: (isMockDataUsed) => set({ isMockDataUsed }),

  setDocumentFile: (docType, file, objectUrl) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [docType]: {
          status: 'ready',
          file,
          fileObjectUrl: objectUrl,
          userConfirmedFields: [],
        },
      },
    })),

  setDocumentReading: (docType) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [docType]: {
          ...state.documents[docType],
          status: 'reading',
          userConfirmedFields: state.documents[docType]?.userConfirmedFields || [],
        },
      },
    })),

  setDocumentExtracted: (docType, extracted) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [docType]: {
          ...state.documents[docType],
          status: 'done',
          extracted,
          userConfirmedFields: state.documents[docType]?.userConfirmedFields || [],
        },
      },
    })),

  setDocumentError: (docType, error) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [docType]: {
          ...state.documents[docType],
          status: 'failed',
          error,
          userConfirmedFields: state.documents[docType]?.userConfirmedFields || [],
        },
      },
    })),

  removeDocument: (docType) => {
    const doc = get().documents[docType];
    if (doc?.fileObjectUrl) {
      URL.revokeObjectURL(doc.fileObjectUrl);
    }
    set((state) => {
      const nextDocs = { ...state.documents };
      delete nextDocs[docType];
      return { documents: nextDocs };
    });
  },

  updateExtractedField: (docType, fieldName, value) =>
    set((state) => {
      const doc = state.documents[docType];
      if (!doc || !doc.extracted) return state;

      const currentField = (doc.extracted.fields as any)[fieldName] || { confidence: 1.0 };
      const updatedFields = {
        ...doc.extracted.fields,
        [fieldName]: {
          ...currentField,
          value,
          confidence: 1.0, // user edited = 100% confidence
        },
      };

      const fieldKey = `${docType}.${fieldName}`;
      const confirmed = Array.from(new Set([...doc.userConfirmedFields, fieldKey]));

      return {
        documents: {
          ...state.documents,
          [docType]: {
            ...doc,
            extracted: {
              ...doc.extracted,
              fields: updatedFields,
            },
            userConfirmedFields: confirmed,
          },
        },
      };
    }),

  confirmField: (docType, fieldName) =>
    set((state) => {
      const doc = state.documents[docType];
      if (!doc) return state;
      const fieldKey = `${docType}.${fieldName}`;
      const confirmed = Array.from(new Set([...doc.userConfirmedFields, fieldKey]));
      return {
        documents: {
          ...state.documents,
          [docType]: {
            ...doc,
            userConfirmedFields: confirmed,
          },
        },
      };
    }),

  setReport: (findings, fixPlan) => set({ findings, fixPlan }),

  setCorrectVersionChoice: (findingId, doc) =>
    set((state) => ({
      correctVersionChoice: {
        ...state.correctVersionChoice,
        [findingId]: doc,
      },
    })),

  clearAllData: () => {
    // Revoke any active blob URLs
    const docs = get().documents;
    for (const d of Object.values(docs)) {
      if (d?.fileObjectUrl) {
        URL.revokeObjectURL(d.fileObjectUrl);
      }
    }
    set({
      goalId: null,
      consentAccepted: false,
      isDemoMode: false,
      demoScenarioId: null,
      isMockDataUsed: false,
      documents: {},
      findings: [],
      fixPlan: [],
      correctVersionChoice: {},
    });
  },
}));
