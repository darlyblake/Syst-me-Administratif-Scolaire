"use client"

type SceneKind = "writing" | "recess" | "break" | "late" | "absent" | "excluded" | "going-home" | "free" | "before" | "pending"

export function PresenceScene({kind}:{kind:SceneKind}) {
  const label:Record<SceneKind,string>={
    writing:"Élève assis à son bureau en train d’écrire",
    recess:"Élève qui joue au ballon pendant la récréation",
    break:"Élève qui prend son goûter pendant la pause",
    late:"Élève qui arrive en classe avec son sac",
    absent:"Place vide : élève signalé absent",
    excluded:"Élève qui quitte l’établissement avec son sac après une exclusion",
    "going-home":"Élève qui rentre à la maison avec son sac à dos",
    free:"Élève qui attend calmement le prochain cours",
    before:"Élève qui se prépare avant le début des cours",
    pending:"Élève assis en classe, appel pas encore effectué",
  }
  return <div role="img" aria-label={label[kind]} className="mx-auto flex h-36 w-full max-w-[250px] items-center justify-center">
    <svg viewBox="0 0 260 170" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="130" cy="151" rx="91" ry="8" fill="#CBD5E1" opacity=".55"/>
      {(kind==="writing"||kind==="pending")&&<>
        <path d="M42 132h176" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round"/>
        <path d="M67 90h126v9H67z" fill="#B77945"/><path d="M75 99v34m110-34v34" stroke="#8B5E3C" strokeWidth="6" strokeLinecap="round"/>
        <path d="M102 81h57l-4 10h-49z" fill="#F8FAFC" stroke="#CBD5E1"/>
        <path d="M112 84h34m-34 3h25" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="128" cy="42" r="21" fill="#8B573D"/><path d="M107 39q1-23 23-22 18 2 20 21-13-9-24-8-10 0-19 9Z" fill="#202B3D"/>
        <circle cx="121" cy="43" r="2" fill="#172033"/><circle cx="136" cy="43" r="2" fill="#172033"/><path d="M122 52q6 4 12 0" stroke="#6B3829" strokeWidth="2" strokeLinecap="round"/>
        <path d="M104 70q24-13 48 0l8 25h-64z" fill="#2563EB"/>
        <path d="M108 76 95 91m47-15 10 9" stroke="#8B573D" strokeWidth="8" strokeLinecap="round"/>
        <path d="m150 83 12 9" stroke="#D69B38" strokeWidth="3" strokeLinecap="round"/>
        <path d="M160 90l7-4" stroke="#1E293B" strokeWidth="2" strokeLinecap="round"/>
        <path d="M112 95v18m31-18v18" stroke="#26364B" strokeWidth="7" strokeLinecap="round"/>
        {kind==="pending"&&<circle cx="196" cy="31" r="13" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="2"/><path d="M196 23v9l6 3" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"/>}
        {kind==="writing"&&<path d="m169 79 8-7" stroke="#D69B38" strokeWidth="3" strokeLinecap="round"><animate attributeName="d" values="m169 79 8-7;m169 80 8-6;m169 79 8-7" dur="1.4s" repeatCount="indefinite"/></path>}
      </>}
      {kind==="recess"&&<>
        <circle cx="130" cy="46" r="21" fill="#8B573D"/><path d="M109 42q2-23 24-21 16 2 19 22-15-11-43-1Z" fill="#202B3D"/>
        <circle cx="123" cy="47" r="2" fill="#172033"/><circle cx="138" cy="47" r="2" fill="#172033"/><path d="M124 56q6 5 12 0" stroke="#6B3829" strokeWidth="2" strokeLinecap="round"/>
        <path d="M108 74q22-13 44 0l9 37h-62z" fill="#F59E0B"/>
        <path d="m110 80-22 16m61-16 19-15" stroke="#8B573D" strokeWidth="9" strokeLinecap="round"/>
        <path d="m115 109-14 27m41-27 17 27" stroke="#26364B" strokeWidth="9" strokeLinecap="round"/>
        <path d="M28 126q8-7 16 0m-8-8v16m-8-8h16" stroke="#16A34A" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="204" cy="119" r="17" fill="#F8FAFC" stroke="#1D4ED8" strokeWidth="3"/><path d="m204 102 6 8-6 9-7-9 7-8Zm-17 17 10 1 7 16-11-1-6-16Zm34 0-10 1-7 16 11-1 6-16Z" fill="#1D4ED8"/>
        <path d="M179 101q-8-9-13-2" stroke="#D69B38" strokeWidth="2" strokeLinecap="round"><animate attributeName="d" values="M179 101q-8-9-13-2;M179 101q-8-13-13-5;M179 101q-8-9-13-2" dur="1.2s" repeatCount="indefinite"/></path>
      </>}
      {kind==="break"&&<>
        <path d="M67 132h126" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="128" cy="48" r="21" fill="#8B573D"/><path d="M107 43q3-24 24-22 17 2 19 22-15-10-43 0Z" fill="#202B3D"/>
        <circle cx="121" cy="48" r="2" fill="#172033"/><circle cx="136" cy="48" r="2" fill="#172033"/><path d="M122 57q6 5 12 0" stroke="#6B3829" strokeWidth="2" strokeLinecap="round"/>
        <path d="M104 76q24-14 48 0l9 42h-66z" fill="#0D9488"/>
        <path d="m108 82-17 20m47-20 19 15" stroke="#8B573D" strokeWidth="9" strokeLinecap="round"/>
        <path d="M114 117v17m29-17v17" stroke="#26364B" strokeWidth="8" strokeLinecap="round"/>
        <path d="M171 92h36l-3 31h-30z" fill="#F8FAFC" stroke="#0F766E" strokeWidth="2"/><path d="M177 92q12-15 24 0" stroke="#0F766E" strokeWidth="2"/>
        <path d="M181 106q7-6 14 0" stroke="#D69B38" strokeWidth="3" strokeLinecap="round"/>
        <path d="M190 77q-7-8 0-13 7 5 0 13Z" fill="#F59E0B"><animate attributeName="opacity" values=".5;1;.5" dur="1.8s" repeatCount="indefinite"/></path>
      </>}
      {(kind==="late"||kind==="excluded"||kind==="going-home")&&<>
        <path d="M35 136h190" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round"/>
        <path d="M183 55v79m-8-79h16" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="112" cy="42" r="20" fill="#8B573D"/><path d="M92 39q2-22 23-21 16 2 18 21-16-9-41 0Z" fill="#202B3D"/>
        <circle cx="105" cy="43" r="2" fill="#172033"/><circle cx="119" cy="43" r="2" fill="#172033"/><path d="M106 51q6 4 12 0" stroke="#6B3829" strokeWidth="2" strokeLinecap="round"/>
        <path d="M91 68q21-12 42 0l8 42H83z" fill={kind==="late"?"#F59E0B":"#2563EB"}/>
        <path d="M94 75 78 91m49-16 12 18" stroke="#8B573D" strokeWidth="8" strokeLinecap="round"/>
        <path d="m96 109-7 26m34-26 15 24" stroke="#26364B" strokeWidth="9" strokeLinecap="round"/>
        <path d="M78 72q-15 5-13 27l15 8 13-28Z" fill="#1E40AF" stroke="#1E3A8A" strokeWidth="2"/>
        <path d="m71 84 15 5m-14 2 13 5" stroke="#93C5FD" strokeWidth="2"/>
        {kind==="late"&&<><circle cx="199" cy="31" r="17" fill="#FFF7ED" stroke="#D97706" strokeWidth="2"/><path d="M199 20v12l8 4" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round"/><path d="m151 119 8-7m-7 16 10-6" stroke="#D97706" strokeWidth="2" strokeLinecap="round"/></>}
        {kind!=="late"&&<><path d="M202 91h20m-7-7 7 7-7 7" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M209 104q7-5 14 0" stroke="#16A34A" strokeWidth="2" strokeLinecap="round"/></>}
      </>}
      {kind==="absent"&&<>
        <path d="M48 132h164" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round"/>
        <path d="M75 65h110v11H75z" fill="#B77945"/><path d="M83 76v56m94-56v56" stroke="#8B5E3C" strokeWidth="6" strokeLinecap="round"/>
        <path d="M105 31q25-15 50 0v36h-50z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2"/><path d="M115 44h30m-30 8h20" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="202" cy="38" r="15" fill="#FEF2F2" stroke="#DC2626" strokeWidth="2"/><path d="m196 32 12 12m0-12-12 12" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"/>
      </>}
      {(kind==="free"||kind==="before")&&<>
        <circle cx="130" cy="42" r="21" fill="#8B573D"/><path d="M109 39q2-23 23-21 17 2 19 21-15-10-42 0Z" fill="#202B3D"/>
        <circle cx="123" cy="43" r="2" fill="#172033"/><circle cx="138" cy="43" r="2" fill="#172033"/><path d="M124 52q6 4 12 0" stroke="#6B3829" strokeWidth="2" strokeLinecap="round"/>
        <path d="M107 72q23-13 46 0l8 44h-62z" fill="#64748B"/><path d="M112 115v19m32-19v19" stroke="#26364B" strokeWidth="8" strokeLinecap="round"/>
        <path d="M93 84 80 102m81-18 13 18" stroke="#8B573D" strokeWidth="8" strokeLinecap="round"/>
        <path d="M188 60q14-12 28 0v48h-28z" fill="#1D4ED8"/><path d="M188 71h28m-28 10h28" stroke="#93C5FD" strokeWidth="2"/>
      </>}
    </svg>
  </div>
}
