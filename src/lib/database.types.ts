type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          user_id: string;
          role: "student" | "technologist";
          status: "pending" | "approved" | "suspended";
          full_name: string;
          matric_number: string;
          department: string;
          programme: string;
          level: string;
          created_at: string;
        },
        {
          user_id: string;
          full_name: string;
          matric_number: string;
          department: string;
          programme: string;
          level: string;
          role?: "student" | "technologist";
          status?: "pending" | "approved" | "suspended";
          created_at?: string;
        },
        {
          full_name?: string;
          department?: string;
          programme?: string;
          level?: string;
          role?: "student" | "technologist";
          status?: "pending" | "approved" | "suspended";
        }
      >;
      practicals: Table<
        {
          id: string;
          created_by: string;
          manual_path: string | null;
          manual_name: string | null;
          title: string;
          course_code: string;
          description: string;
          status: "draft" | "active" | "archived";
          due_at: string | null;
          created_at: string;
        },
        {
          created_by: string;
          manual_path?: string | null;
          manual_name?: string | null;
          title: string;
          course_code?: string;
          description?: string;
          status?: "draft" | "active" | "archived";
          due_at?: string | null;
          id?: string;
          created_at?: string;
        },
        {
          manual_path?: string | null;
          manual_name?: string | null;
          title?: string;
          course_code?: string;
          description?: string;
          status?: "draft" | "active" | "archived";
          due_at?: string | null;
        }
      >;
      practical_fields: Table<
        {
          id: string;
          practical_id: string;
          title: string;
          instructions: string;
          marking_criteria: string;
          max_points: number;
          position: number;
          required: boolean;
        },
        {
          practical_id: string;
          title: string;
          instructions?: string;
          marking_criteria: string;
          max_points: number;
          position: number;
          required?: boolean;
          id?: string;
        },
        {
          title?: string;
          instructions?: string;
          marking_criteria?: string;
          max_points?: number;
          position?: number;
          required?: boolean;
        }
      >;
      assignments: Table<
        {
          id: string;
          practical_id: string;
          student_id: string;
          assigned_by: string;
          created_at: string;
        },
        { practical_id: string; student_id: string; assigned_by: string; id?: string },
        { practical_id?: string; student_id?: string }
      >;
      report_codes: Table<
        {
          id: string;
          assignment_id: string;
          code_hash: string;
          expires_at: string;
          used_at: string | null;
          used_by: string | null;
          created_by: string;
          created_at: string;
        },
        {
          assignment_id: string;
          code_hash: string;
          expires_at: string;
          created_by: string;
          id?: string;
        },
        { expires_at?: string }
      >;
      reports: Table<
        {
          id: string;
          assignment_id: string;
          student_id: string;
          status: "draft" | "submitted" | "reviewed" | "approved" | "returned";
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        },
        { assignment_id: string; student_id: string; id?: string },
        {
          status?: "draft" | "submitted" | "reviewed" | "approved" | "returned";
          submitted_at?: string | null;
        }
      >;
      report_pages: Table<
        { id: string; report_id: string; page_number: number; created_at: string },
        { report_id: string; page_number: number; id?: string },
        { page_number?: number }
      >;
      report_answers: Table<
        { id: string; page_id: string; field_id: string; answer: string; updated_at: string },
        { page_id: string; field_id: string; answer?: string; id?: string },
        { answer?: string }
      >;
      report_sketches: Table<
        {
          id: string;
          report_id: string;
          object_path: string;
          position: number;
          created_at: string;
        },
        { report_id: string; object_path: string; position: number; id?: string },
        { object_path?: string; position?: number }
      >;
      ai_assessments: Table<
        {
          id: string;
          report_id: string;
          status: "pending" | "completed" | "failed";
          suggested_total: number | null;
          final_total: number | null;
          feedback: string | null;
          provider_model: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          approved_at: string | null;
          created_at: string;
        },
        { report_id: string; status?: "pending" | "completed" | "failed"; id?: string },
        {
          status?: "pending" | "completed" | "failed";
          suggested_total?: number | null;
          final_total?: number | null;
          feedback?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          approved_at?: string | null;
        }
      >;
      ai_assessment_items: Table<
        {
          id: string;
          assessment_id: string;
          field_id: string;
          suggested_points: number;
          final_points: number | null;
          feedback: string;
          technologist_feedback: string | null;
        },
        {
          assessment_id: string;
          field_id: string;
          suggested_points: number;
          final_points?: number | null;
          feedback: string;
          technologist_feedback?: string | null;
          id?: string;
        },
        { final_points?: number | null; technologist_feedback?: string | null }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      claim_report_code: { Args: { p_code_hash: string }; Returns: string };
      submit_report: { Args: { p_report_id: string }; Returns: undefined };
      create_practical_with_fields: {
        Args: {
          p_title: string;
          p_course_code: string;
          p_description: string;
          p_due_at: string | null;
          p_fields: Array<{
            title: string;
            instructions: string;
            marking_criteria: string;
            max_points: number;
            required: boolean;
          }>;
        };
        Returns: string;
      };
      update_practical_with_fields: {
        Args: {
          p_practical_id: string;
          p_title: string;
          p_course_code: string;
          p_description: string;
          p_fields: Array<{
            title: string;
            instructions: string;
            marking_criteria: string;
            max_points: number;
            required: boolean;
          }>;
        };
        Returns: undefined;
      };
      attach_practical_manual: {
        Args: {
          p_practical_id: string;
          p_manual_path: string | null;
          p_manual_name: string | null;
        };
        Returns: undefined;
      };
      publish_practical: { Args: { p_practical_id: string }; Returns: undefined };
      create_practical_report_code: {
        Args: {
          p_practical_id: string;
          p_student_id: string;
          p_code_hash: string;
          p_expires_at: string;
        };
        Returns: string;
      };
      begin_ai_assessment: { Args: { p_report_id: string }; Returns: boolean };
      approve_ai_assessment: { Args: { p_assessment_id: string }; Returns: number };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
