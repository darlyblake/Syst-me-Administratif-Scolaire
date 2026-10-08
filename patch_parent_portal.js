const fs = require('fs');
let content = fs.readFileSync('hooks/use-parent-portal.ts', 'utf8');

// 1. Add Type
content = content.replace(
  'export type ParentDocument =',
  `export type ParentSchoolDocumentRequest = { id: string; establishment_id: string; student_id: string; document_type: string; message: string | null; status: string; rejection_reason: string | null; created_at: string; updated_at: string }\nexport type ParentDocument =`
);

// 2. Add State
content = content.replace(
  'const [timetable,setTimetable]=useState<ParentTimetableSlot[]>([]), [lessons,setLessons]=useState<ParentLesson[]>([]), [homework,setHomework]=useState<ParentHomework[]>([]), [documents,setDocuments]=useState<ParentDocument[]>([])',
  'const [timetable,setTimetable]=useState<ParentTimetableSlot[]>([]), [lessons,setLessons]=useState<ParentLesson[]>([]), [homework,setHomework]=useState<ParentHomework[]>([]), [documents,setDocuments]=useState<ParentDocument[]>(), [schoolDocumentRequests,setSchoolDocumentRequests]=useState<ParentSchoolDocumentRequest[]>([])'
);

// 3. Update return statement
content = content.replace(
  ',documents,claimChild',
  ',documents,schoolDocumentRequests,claimChild'
);

// 4. Add to fetch promise array
content = content.replace(
  'supabaseBrowser.from("parent_document_publications").select("id,student_id,document_id,published_at,title_override").in("student_id",studentIds).eq("active",true).order("published_at",{ascending:false}).limit(200)',
  'supabaseBrowser.from("parent_document_publications").select("id,student_id,document_id,published_at,title_override").in("student_id",studentIds).eq("active",true).order("published_at",{ascending:false}).limit(200),\n        supabaseBrowser.from("school_document_requests").select("id,establishment_id,student_id,document_type,message,status,rejection_reason,created_at,updated_at").in("student_id",studentIds).order("created_at",{ascending:false}).limit(200)'
);

// 5. Destructure and set
content = content.replace(
  'const [psr,par,ar,eor,jr,ev,tsr,tlr,thr,pdr] = await Promise.all([',
  'const [psr,par,ar,eor,jr,ev,tsr,tlr,thr,pdr,sdr] = await Promise.all(['
);

content = content.replace(
  '["documents",pdr]] as const) if(r.error) console.warn("Parent "+name+" query:",r.error)',
  '["documents",pdr],["school_document_requests",sdr]] as const) if(r.error) console.warn("Parent "+name+" query:",r.error)'
);

content = content.replace(
  'setDocuments(docs)\n      } catch(documentCause) {',
  'setDocuments(docs)\n      } catch(documentCause) {\n        console.warn("Parent portal documents error:",documentCause)\n        setDocuments([])\n      }\n      try { setSchoolDocumentRequests((sdr.data??[]) as ParentSchoolDocumentRequest[]) } catch(e) {}'
);

// Need to also make sure the first occurrence of setDocuments initialization gets handled.
fs.writeFileSync('hooks/use-parent-portal.ts', content);
