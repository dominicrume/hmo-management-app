// Forms barrel — import from '@/components/forms'
export { default as Form01IntakeChecklist }    from './Form01IntakeChecklist';
export { default as Form02SupportChecklist }   from './Form02SupportChecklist';
export { default as Form03PersonalDetails }    from './Form03PersonalDetails';
export { default as Form04MissingPerson }      from './Form04MissingPerson';
export { default as Form05ConfidentialityWaiver } from './Form05ConfidentialityWaiver';
export { default as Form06ServiceCharge }      from './Form06ServiceCharge';
export { default as Form07RiskAssessment }     from './Form07RiskAssessment';
export { default as Form08SupportPlan }        from './Form08SupportPlan';
export { default as OCRUploadField }           from './OCRUploadField';

// Shared primitives
export {
  TextField,
  TextareaField,
  SelectField,
  CheckboxField,
  FormSection,
  FormActions,
} from './FormField';

// Types
export type { Form01Data } from './Form01IntakeChecklist';
export type { Form02Data } from './Form02SupportChecklist';
export type { Form03Data } from './Form03PersonalDetails';
export type { Form04Data } from './Form04MissingPerson';
export type { Form05Data } from './Form05ConfidentialityWaiver';
export type { Form06Data } from './Form06ServiceCharge';
export type { Form07Data } from './Form07RiskAssessment';
export type { Form08Data } from './Form08SupportPlan';
export type { ExtractedFields } from '@/lib/ocr/googleVision';
