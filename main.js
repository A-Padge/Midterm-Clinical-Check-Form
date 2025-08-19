import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-auth.js';
import { getFirestore, collection, addDoc } from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBZieSNvs_E3GQHfQ4bR7exiA_b-RxN-BQ",
  authDomain: "my-clinical-forms.firebaseapp.com",
  projectId: "my-clinical-forms",
  storageBucket: "my-clinical-forms.firebasestorage.app",
  messagingSenderId: "479710055961",
  appId: "1:479710055961:web:52806a0fa038537a66a488"
};

const appId = firebaseConfig.appId;

const { useRef, useState, useEffect } = React;

const App = () => {
  const [formData, setFormData] = useState({
    facilityName: '', scceName: '', ciName: '', ciLicense: '',
    ciExperience: '', reviewedPolicies: '', communication: '',
    contactMethod: [], feedbackFrequency: [], feedbackType: [],
    feedbackTime: '', preparedness: '', progression: '',
    timeManagement: '', notesCorrection: '', caseLoad: '',
    meetExpectations: '', treatmentTechniques: '', specializations: [],
    ccipInterest: [], willingToTakeStudent: '', firstDayOriented: '',
    communicationWithTeam: '', supervisionStyle: [], patientsPerDay: '',
    vitals: '', ipeInvolvement: '', otherConcerns: '',
  });

  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const canvasRefs = useRef({});
  const contextRefs = useRef({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#000000');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (Object.keys(firebaseConfig).length === 0) {
      setStatusMessage('Firebase configuration not found. Data saving is disabled.');
      return;
    }

    const app = initializeApp(firebaseConfig);
    const authInstance = getAuth(app);
    const dbInstance = getFirestore(app);
    setAuth(authInstance);
    setDb(dbInstance);

    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    const authenticate = async () => {
      try {
        await signInAnonymously(authInstance);
      } catch (error) {
        console.error("Firebase authentication failed:", error);
        setStatusMessage("Authentication failed. Data saving is not possible.");
      }
    };
    authenticate();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    Object.keys(canvasRefs.current).forEach(id => {
      const canvas = canvasRefs.current[id];
      if (canvas) {
        const container = canvas.parentElement;
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        const context = canvas.getContext('2d');
        if (context) {
          context.lineCap = 'round';
          context.strokeStyle = penColor;
          context.lineWidth = 4;
          contextRefs.current[id] = context;
        }
      }
    });
  }, [penColor, userId]);

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (type === 'checkbox') {
      setFormData(prevData => {
        const newArray = checked ? [...prevData[name], value] : prevData[name].filter(item => item !== value);
        return { ...prevData, [name]: newArray, };
      });
    } else {
      setFormData(prevData => ({ ...prevData, [name]: value, }));
    }
  };

  const getPointerCoordinates = (event, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches && event.touches.length > 0 ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches && event.touches.length > 0 ? event.touches[0].clientY : event.clientY;
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;
    return { offsetX, offsetY };
  };

  const startDrawing = (event, id) => {
    const canvas = canvasRefs.current[id];
    const context = contextRefs.current[id];
    if (canvas && context) {
      const { offsetX, offsetY } = getPointerCoordinates(event.nativeEvent, canvas);
      context.beginPath();
      context.moveTo(offsetX, offsetY);
      setIsDrawing(true);
    }
  };

  const draw = (event, id) => {
    if (!isDrawing) return;
    const canvas = canvasRefs.current[id];
    const context = contextRefs.current[id];
    if (canvas && context) {
      const { offsetX, offsetY } = getPointerCoordinates(event.nativeEvent, canvas);
      context.lineTo(offsetX, offsetY);
      context.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      Object.values(contextRefs.current).forEach(context => {
        if (context) context.closePath();
      });
      setIsDrawing(false);
    }
  };

  const clearCanvas = (id) => {
    const canvas = canvasRefs.current[id];
    const context = contextRefs.current[id];
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSave = async () => {
    if (!db || !userId) {
      setStatusMessage("Application is not ready to save data. Please wait.");
      return;
    }

    try {
      setStatusMessage("Saving form data...");
      const drawingData = {};
      Object.keys(canvasRefs.current).forEach(id => {
        const canvas = canvasRefs.current[id];
        if (canvas) {
          drawingData[id] = canvas.toDataURL();
        }
      });
      const completeRecord = { ...formData, ...drawingData, timestamp: new Date().toISOString(), };
      const formsCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'forms');
      await addDoc(formsCollectionRef, completeRecord);
      setStatusMessage("Form successfully saved! ✅");
    } catch (error) {
      console.error("Error saving document: ", error);
      setStatusMessage("Failed to save form. Please try again.");
    }
  };

  const questions = [
    { id: 'facilityName', label: '1. Facility Name:', type: 'text', },
    { id: 'scceName', label: '2. Site Coordinator of Clinical Education (SCCE) Name:', type: 'text', },
    { id: 'ciName', label: '3. Clinical Instructor (CI) Name:', type: 'text', },
    { id: 'ciLicense', label: '4. CI License Type', type: 'radio', options: ['Physical Therapist', 'Physical Therapist Assistant'], },
    { id: 'ciExperience', label: '5. How many years of experience does the CI have?', type: 'radio', options: ['0-1 years', '1-2 years', '3-5 years', '5-9 years', '10+ years'], },
    { id: 'reviewedPolicies', label: '6. Has the student located and reviewed facility policies and procedures?', type: 'radio', options: ['Yes', 'No'], },
    { id: 'communication', label: '7. Do you feel the communication between you (the CI) and the school DCE is effective and sufficient to support the clinical affiliation?', type: 'radio', options: ['Yes', 'No'], },
    { id: 'contactMethod', label: '8. Preferred method of contact for the DCE to discuss student\'s clinical performance?', type: 'checkbox', options: ['Clinical Visits', 'Phone', 'Email'], },
    { id: 'feedbackFrequency', label: '9. How often do you provide the student with constructive feedback?', type: 'checkbox', options: ['Daily', 'Weekly', 'Midterm/Final'], },
    { id: 'feedbackType', label: '10. What type of feedback is provided?', type: 'checkbox', options: ['Oral', 'Written', 'Demonstration'], },
    { id: 'feedbackTime', label: '11. Do you allow for adequate time for student/CI feedback and discussion?', type: 'radio', options: ['Yes', 'No'], },
    { id: 'preparedness', label: '12. Do you feel the student has been prepared for the clinical experience so far?', type: 'radio', options: ['Yes', 'No'], },
    { id: 'progression', label: '13. Is the student able to properly progress and regress patient treatments?', type: 'radio', options: ['Yes, and the student is able to identify when this needs to occur', 'Yes, but requires v/c from CI to do so', 'Sometimes. Students ability to identify need as well as proper progression and regression is inconsistent', 'No. The student is unable to adequately progress or regress a patient without significant help and assistance from CI'], },
    { id: 'timeManagement', label: '14. How would you rate the students time management skills/abilities?', type: 'radio', options: [...Array(10).keys()].map(i => `${i + 1}`), sublabel: '1 = Little, 10 = Excellent', },
    { id: 'notesCorrection', label: '15. What percentage of notes requires correction or improvement from the CI?', type: 'radio', options: [...Array(10).keys()].map(i => `${i + 1}`), sublabel: '1 = 100%, 10 = Less than 10% (good)', },
    { id: 'caseLoad', label: '16. What is the normal case load for an Entry Level PTA at this facility?', type: 'textarea', rows: 2, },
    { id: 'meetExpectations', label: '17. Are you able to provide the supervision and experiences necessary to meet the clinical expectations? (Including the appropriate student progression and independence with daily treatments.)', type: 'radio', options: ['Yes', 'No'], },
    { id: 'treatmentTechniques', label: '18. Have you shown any treatment techniques that you feel should be a part of our academic coursework?', type: 'radio', options: ['Yes', 'No'], },
    { id: 'specializations', label: '19. Specializations and certifications already achieved:', type: 'checkbox', options: ['Level 1 CCIP', 'Level 2 CCIP', 'Clinical Specialist (e.g Orthopedics, Neuro, etc)', 'Advanced Proficiency (Orthopedics, Neurology, etc)', 'Graston', 'LSVT Big', 'Other'], },
    { id: 'ccipInterest', label: '20. Would you be interested in attending a Level 1 CCIP course if provided by the college?', type: 'checkbox', options: ['Yes - Late spring/early summer', 'Yes - Late summer/early fall', 'Yes - Late fall/early winter', 'Yes - Late winter/early spring', 'No'], },
    { id: 'willingToTakeStudent', label: '21. Would you be willing to take another student from our PTA Program?', type: 'radio', options: ['Yes', 'No'], },
    { id: 'firstDayOriented', label: '22. On your first day at your clinical site were you oriented to the department and clinical center by being provided a tour/introduction for the location of appropriate equipment, policies, personnel, and clinical center policies & procedures?', type: 'radio', options: ['Yes', 'No'], },
    { id: 'communicationWithTeam', label: '23. Has the communication with your CI and other healthcare team members been constructive and helpful?', type: 'radio', options: ['Yes', 'No'], },
    { id: 'supervisionStyle', label: '24. Describe the supervision and learning experience provided by your clinical instructor. (Select all that apply)', type: 'checkbox', options: ['Collaborative Hands-On Style: The instructor often treats patients alongside the student, providing direct guidance, demonstrations, and immediate feedback during sessions to build skills through joint practice.', 'Independent Autonomy Style: The instructor gives the student significant space to manage cases independently, stepping in only for critical interventions or debriefs, fostering self-reliance and problem-solving.', 'Balanced Hybrid Style: The instructor combines elements of hands-on collaboration and independent space, adjusting based on the student\'s progress, the complexity of the case, or specific learning needs.', 'Micromanaging Oversight Style: The instructor closely supervises every detail of the student\'s work, offering constant directives and corrections, which may limit the student\'s ability to develop autonomy or treat patients effectively on their own.', 'Mentorship-Focused Style: The instructor acts as a mentor, offering advice and resources while encouraging the student to lead, with regular check-ins to discuss decisions and outcomes without constant presence.', 'Observational Feedback Style: The instructor primarily observes the student from a distance, providing post-session feedback and discussions to analyze performance, allowing the student to learn through trial and reflection.' ], },
    { id: 'patientsPerDay', label: '25. How many patients are treating (taking the lead with) per day?', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12+'], },
    { id: 'vitals', label: '26. Does this level/type of patient care require you to take frequent vitals and monitor vitals?', type: 'radio', options: ['Yes, I take and monitor vitals consistently and often', 'Yes, I take and monitor vitals occasionally', 'I rarely have to take and monitor vitals (but have a handful of times)', 'No. I have not yet needed to take vitals or monitor vitals for my patients.'], },
    { id: 'ipeInvolvement', label: '27. Have you been involved with IPE/co-treatments at the clinical center?', type: 'radio', options: ['Yes', 'No'], },
    { id: 'otherConcerns', label: '28. Any other concerns?', type: 'textarea', rows: 4, },
  ];

  const FormQuestion = ({ question }) => {
    const { id, label, type, options, sublabel, rows } = question;
    const isTextOrTextarea = type === 'text' || type === 'textarea';
    const renderInput = () => {
      switch (type) {
        case 'text':
          return (<input type="text" id={id} name={id} value={formData[id]} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"/>);
        case 'textarea':
          return (<textarea id={id} name={id} rows={rows} value={formData[id]} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"></textarea>);
        case 'radio':
          return (<div className="mt-2 space-y-2">{options.map(option => (<label key={option} className="flex items-center text-sm"><input type="radio" name={id} value={option} checked={formData[id] === option} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"/><span className="ml-3">{option}</span></label>))}</div>);
        case 'checkbox':
          return (<div className="mt-2 space-y-2">{options.map(option => (<label key={option} className="flex items-center text-sm"><input type="checkbox" name={id} value={option} checked={formData[id].includes(option)} onChange={handleInputChange} className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"/><span className="ml-3">{option}</span></label>))}</div>);
        case 'select':
          return (<select id={id} name={id} value={formData[id]} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"><option value="">Select an option</option>{options.map(option => (<option key={option} value={option}>{option}</option>))}</select>);
        default: return null;
      }
    };

    return (<div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-8"><div className={`flex-1 w-full space-y-2 ${isTextOrTextarea ? '' : 'self-start'}`}><label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>{sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}{renderInput()}</div><div className="flex-1 w-full"><div className="h-24 w-full border border-gray-300 rounded-lg overflow-hidden relative"><canvas ref={el => canvasRefs.current[`${id}Canvas`] = el} className="absolute inset-0 w-full h-full touch-none" onPointerDown={(e) => startDrawing(e, `${id}Canvas`)} onPointerMove={(e) => draw(e, `${id}Canvas`)} onPointerUp={stopDrawing} onPointerLeave={stopDrawing}></canvas></div><button onClick={() => clearCanvas(`${id}Canvas`)} className="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors duration-200">Clear Notes</button></div></div>);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4 font-inter">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-4xl p-8 space-y-8">
        <h1 className="text-3xl font-bold text-gray-800 text-center">Midterm Clinical Site Contact Form</h1>
        <p className="text-gray-600 text-center">Please fill out this form and use the space provided to add notes with your Apple Pencil.</p>
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-700">Facility and Clinical Instructor Information</h2>
          {questions.slice(0, 4).map(q => <FormQuestion key={q.id} question={q} />)}
        </div>
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-700">DCE Evaluation of the CI/Clinical Site</h2>
          {questions.slice(4, 22).map(q => <FormQuestion key={q.id} question={q} />)}
        </div>
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-700">Student Responses</h2>
          {questions.slice(21, 24).map(q => <FormQuestion key={q.id} question={q} />)}
        </div>
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-700">Patient Load and Interprofessional Collaboration</h2>
          {questions.slice(24, 28).map(q => <FormQuestion key={q.id} question={q} />)}
        </div>
        <div className="flex flex-col items-center justify-center p-4 rounded-xl shadow-inner bg-gray-50 space-y-4">
          <div className="flex space-x-2">
            <label className="text-sm font-medium text-gray-700">Pen Color:</label>
            <input type="color" value={penColor} onChange={(e) => setPenColor(e.target.value)} className="w-8 h-8 rounded-full border border-gray-300 cursor-pointer"/>
          </div>
          <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-blue-500 text-white font-bold shadow-md hover:bg-blue-600 transition-colors duration-200">Save Form</button>
          {statusMessage && <p className="mt-2 text-sm text-center text-gray-600">{statusMessage}</p>}
          <p className="text-xs text-gray-500 text-center">Your User ID is: {userId || 'Authenticating...'}</p>
        </div>
      </div>
    </div>
  );
};

const domContainer = document.querySelector('#root');
const root = ReactDOM.createRoot(domContainer);
root.render(React.createElement(App));
