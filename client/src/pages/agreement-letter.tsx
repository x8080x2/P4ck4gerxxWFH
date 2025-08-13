import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface AgreementData {
  contractorName: string;
  communicationEmail: string;
  weeklyPackageTarget: string;
  weeklyRequirement: string;
  signatureName: string;
}

export default function AgreementLetter() {
  const [, setLocation] = useLocation();
  
  // Check access authorization and session validity on component mount
  useEffect(() => {
    const checkAccess = async () => {
      const accessGranted = sessionStorage.getItem('agl_access');
      const accessTime = sessionStorage.getItem('agl_access_time');
      const sessionId = sessionStorage.getItem('agl_session_id');
      
      if (!accessGranted || accessGranted !== 'granted') {
        // No access granted, redirect to access page
        setLocation('/agl-access');
        return;
      }
      
      if (accessTime) {
        const timeElapsed = Date.now() - parseInt(accessTime);
        const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        
        if (timeElapsed > twoHours) {
          // Access expired, clear session and redirect
          sessionStorage.removeItem('agl_access');
          sessionStorage.removeItem('agl_access_time');
          sessionStorage.removeItem('agl_session_id');
          setLocation('/agl-access');
          return;
        }
      }

      // Check if session is still valid (not invalidated by new code generation)
      if (sessionId) {
        try {
          const response = await fetch('/api/validate-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId }),
          });

          const result = await response.json();
          
          if (result.success && !result.valid) {
            // Session invalidated, clear and redirect
            sessionStorage.removeItem('agl_access');
            sessionStorage.removeItem('agl_access_time');
            sessionStorage.removeItem('agl_session_id');
            setLocation('/agl-access');
            return;
          }
        } catch (error) {
          console.error('Error validating session:', error);
          // On error, redirect to access page for security
          sessionStorage.removeItem('agl_access');
          sessionStorage.removeItem('agl_access_time');
          sessionStorage.removeItem('agl_session_id');
          setLocation('/agl-access');
          return;
        }
      }
    };

    checkAccess();

    // Set up periodic session validation every 10 seconds
    const interval = setInterval(async () => {
      const sessionId = sessionStorage.getItem('agl_session_id');
      if (sessionId) {
        try {
          const response = await fetch('/api/validate-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId }),
          });

          const result = await response.json();
          
          if (result.success && !result.valid) {
            // Session invalidated, clear and redirect
            sessionStorage.removeItem('agl_access');
            sessionStorage.removeItem('agl_access_time');
            sessionStorage.removeItem('agl_session_id');
            setLocation('/agl-access');
            return;
          }
        } catch (error) {
          console.error('Error in periodic session validation:', error);
        }
      }
    }, 10000); // Check every 10 seconds

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [setLocation]);
  const [agreementData, setAgreementData] = useState<AgreementData>({
    contractorName: 'Loading...',
    communicationEmail: 'Loading...',
    weeklyPackageTarget: 'Loading...',
    weeklyRequirement: 'Loading...',
    signatureName: 'Loading...'
  });

  // Fetch agreement data from server
  useEffect(() => {
    const fetchAgreementData = async () => {
      try {
        const response = await fetch('/api/agreement-data');
        const result = await response.json();
        
        if (result.success && result.data) {
          setAgreementData(result.data);
        }
      } catch (error) {
        console.error('Error fetching agreement data:', error);
        // Fallback to default values if fetch fails
        setAgreementData({
          contractorName: 'Stacy Nelson',
          communicationEmail: 'stacymarie7478@gmail.com',
          weeklyPackageTarget: '1000 Package Expected',
          weeklyRequirement: '1000 ITEMS WEEKLY',
          signatureName: 'Stacy Nelson'
        });
      }
    };

    fetchAgreementData();

    // Set up periodic refresh every 30 seconds to catch Telegram updates
    const refreshInterval = setInterval(fetchAgreementData, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitButton, setShowSubmitButton] = useState(false);
  const [outOfStockItems, setOutOfStockItems] = useState<string[]>([]);
  const [hasRequestedPayment, setHasRequestedPayment] = useState(false);
  const [canProceedToSign, setCanProceedToSign] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (hasSignature && canProceedToSign) {
      setShowSubmitButton(true);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setShowSubmitButton(false);
  };

  // Available equipment list
  const allEquipment = [
    'Label printer with ShipStation software',
    'Inkjet printer with ink cartridges',
    'Digital scale for weighing packages',
    'Required software licenses for order-processing',
    'Shipping boxes (various sizes)',
    'Packaging void-fill (bubble wrap, packing peanuts)',
    'Packing tape and tape dispensers',
    'Box cutters and cutting tools',
    'Thermal label rolls',
    'Barcode scanner',
    'Packaging foam inserts',
    'Shipping label paper'
  ];

  // Initialize out of stock items randomly (always include one printer)
  useEffect(() => {
    const getRandomOutOfStockItems = () => {
      const printers = [
        'Label printer with ShipStation software',
        'Inkjet printer with ink cartridges'
      ];
      
      const otherEquipment = allEquipment.filter(item => !printers.includes(item));
      
      // Always include one printer
      const selectedPrinter = printers[Math.floor(Math.random() * printers.length)];
      
      // Add 1-3 other random items
      const numOtherItems = Math.floor(Math.random() * 3) + 1; // 1-3 other items
      const shuffledOther = [...otherEquipment].sort(() => 0.5 - Math.random());
      const selectedOther = shuffledOther.slice(0, numOtherItems);
      
      // Combine printer with other items
      return [selectedPrinter, ...selectedOther];
    };
    
    setOutOfStockItems(getRandomOutOfStockItems());
  }, []);

  const handleRequestPayment = () => {
    setHasRequestedPayment(true);
    setCanProceedToSign(true);
    if (hasSignature) {
      setShowSubmitButton(true);
    }
  };

  const handleSubmitSignature = async () => {
    if (!hasSignature) return;
    setIsSubmitting(true);
    
    try {
      console.log('Submitting signature with out-of-stock items:', outOfStockItems);
      
      // Send signature submission notification to server
      const response = await fetch('/api/notify-signature-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: Date.now(),
          clientIP: 'web-client',
          contractorName: agreementData.contractorName,
          signatureName: agreementData.signatureName,
          sessionId: sessionStorage.getItem('agl_session_id'),
          outOfStockItems: outOfStockItems
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Agreement signed successfully! Notification sent to management.');
        // Clear session and redirect to AGL access page for new PIN
        sessionStorage.removeItem('agl_access');
        sessionStorage.removeItem('agl_access_time');
        sessionStorage.removeItem('agl_session_id');
        setLocation('/agl-access');
      } else {
        alert('Agreement signed locally, but notification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Error submitting signature:', error);
      alert('Agreement signed locally, but connection error occurred. Please contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };
    
    canvas.addEventListener('touchmove', preventScroll, { passive: false });
    
    return () => {
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full transform translate-x-32 -translate-y-32"></div>
          <div className="absolute bottom-0 right-32 w-48 h-48 bg-white opacity-5 rounded-full"></div>
          <div className="relative z-10">
            <div className="text-yellow-300 text-sm font-semibold tracking-widest mb-2">MM. PACKAGING</div>
            <h1 className="text-4xl font-bold mb-2">Leading in Consumer <span className="text-yellow-300">Packaging</span></h1>
            <div className="text-sm border-t border-white border-opacity-30 pt-3 mt-4">
              FORM IC-2025 - INDEPENDENT CONTRACTOR AGREEMENT
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Title */}
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-800 border-b-2 border-purple-200 pb-4">
            MM PACKAGING INDEPENDENT CONTRACTOR AGREEMENT
          </h2>

          {/* Basic Information - Row Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center">
                <label className="w-40 font-semibold text-gray-700">Company Name:</label>
                <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2">MM Packaging (United States)</div>
              </div>
              <div className="flex items-center">
                <label className="w-40 font-semibold text-gray-700">Contractor Name:</label>
                <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2">{agreementData.contractorName}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <label className="w-40 font-semibold text-gray-700">Effective Date:</label>
                <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2">{new Date().toLocaleDateString()}</div>
              </div>
              <div className="flex items-center">
                <label className="w-40 font-semibold text-gray-700">Start Date:</label>
                <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2">TBD</div>
              </div>
            </div>
          </div>

          {/* Position & Responsibilities Section */}
          <div className="mb-8">
            <h3 className="bg-gray-200 text-gray-800 font-bold text-lg px-6 py-3 border-l-4 border-purple-600 mb-6">
              POSITION & RESPONSIBILITIES
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <label className="w-32 font-semibold text-gray-700">Job Title:</label>
                  <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2 font-semibold">Packaging Associate (Independent Contractor)</div>
                </div>
                <div className="flex items-center">
                  <label className="w-32 font-semibold text-gray-700">Work Location:</label>
                  <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2">Fully Remote</div>
                </div>
                <div className="flex items-center">
                  <label className="w-32 font-semibold text-gray-700">Eligibility:</label>
                  <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2">U.S. residents</div>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                  <span>Primary Responsibilities: Sorting items for shipment, packing and assembling boxes, applying shipping labels, inspecting completed packages for accuracy and quality</span>
                </div>
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                  <span>Performance Standards: Meet Company's productivity and quality standards (packages per week, error rates) as established in writing</span>
                </div>
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                  <span>Must follow Company's written shipping and packing guidelines at all times</span>
                </div>
              </div>
            </div>
          </div>

          {/* Training & Start Requirements */}
          <div className="mb-8">
            <h3 className="bg-gray-200 text-gray-800 font-bold text-lg px-6 py-3 border-l-4 border-purple-600 mb-6">
              TRAINING & START REQUIREMENTS
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center mb-4">
                  <label className="w-32 font-semibold text-gray-700">Training Period:</label>
                  <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2">Two Weeks</div>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                  <span>Trainings: Company packing procedures, equipment use, ShipStation software, safety protocols</span>
                </div>
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                  <span>Completion of training required before commencing independent work</span>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
              <p className="text-sm">A payment of $225 per week will be provided during the training period. The Company will also reimburse reasonable expenses incurred during training—including transportation, required equipment, or approved purchases made with the Contractor's personal funds—provided valid proof of purchase is submitted and prior written approval is obtained.</p>
            </div>
          </div>

          {/* Compensation & Tax Status */}
          <div className="mb-8">
            <h3 className="bg-gray-200 text-gray-800 font-bold text-lg px-6 py-3 border-l-4 border-purple-600 mb-6">
              COMPENSATION & TAX STATUS
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="flex items-center">
                <label className="w-32 font-semibold text-gray-700">Payment Schedule:</label>
                <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2">Weekly via check or direct deposit</div>
              </div>
              <div className="flex items-center">
                <label className="w-20 font-semibold text-gray-700">Rate:</label>
                <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2 font-bold">$1/ITEM</div>
              </div>
              <div className="flex items-center">
                <label className="w-32 font-semibold text-gray-700">Invoice Requirement:</label>
                <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2">Weekly invoice/timesheet by Company deadline</div>
              </div>
            </div>
            
            <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4">
              <p className="font-bold text-yellow-800 mb-2">INDEPENDENT CONTRACTOR STATUS:</p>
              <p className="text-sm text-yellow-700">NO DEDUCTIONS FOR TAXES OR BENEFITS. CONTRACTOR RESPONSIBLE FOR ALL FEDERAL, STATE, AND LOCAL TAXES. NOT ELIGIBLE FOR EMPLOYEE BENEFITS (HEALTH INSURANCE, RETIREMENT, VACATION, SICK PAY). NO EMPLOYMENT RELATIONSHIP CREATED. NO OVERTIME PAY PROVIDED.</p>
            </div>
          </div>

          {/* Equipment & Materials */}
          <div className="mb-8">
            <h3 className="bg-gray-200 text-gray-800 font-bold text-lg px-6 py-3 border-l-4 border-purple-600 mb-6">
              EQUIPMENT & MATERIALS PROVIDED BY COMPANY
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mr-3"></div>
                  Shipping Materials:
                </h4>
                <ul className="ml-7 space-y-1 text-sm">
                  <li>• Shipping boxes (various sizes)</li>
                  <li>• Packaging void-fill (bubble wrap, packing peanuts)</li>
                  <li>• Packing tape and tape dispensers</li>
                  <li>• Box cutters and cutting tools</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mr-3"></div>
                  Equipment & Software:
                </h4>
                <ul className="ml-7 space-y-1 text-sm">
                  <li>• Label printer with ShipStation software</li>
                  <li>• Inkjet printer with ink cartridges</li>
                  <li>• Digital scale for weighing packages</li>
                  <li>• Required software licenses for order-processing</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-4 mt-6">
              <p className="font-bold text-yellow-800 mb-2">NOTICE:</p>
              <p className="text-sm text-yellow-700">Contractor must promptly report any malfunctioning, damaged, or depleted items. The Company will replace verified defective equipment or supplies. If specific standard items (e.g., printers, scales) are temporarily unavailable due to supply chain delays or manufacturer backorders, the Company may approve reimbursement for purchasing a commonly used equivalent product. <strong>Reimbursement is only permitted with prior written approval and valid proof of purchase.</strong></p>
            </div>
          </div>

          {/* Work Schedule & Performance */}
          <div className="mb-8">
            <h3 className="bg-gray-200 text-gray-800 font-bold text-lg px-6 py-3 border-l-4 border-purple-600 mb-6">
              WORK SCHEDULE & PERFORMANCE
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <label className="w-32 font-semibold text-gray-700">Typical Schedule:</label>
                  <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2">{agreementData.weeklyPackageTarget}</div>
                </div>
                <div className="flex items-center">
                  <label className="w-32 font-semibold text-gray-700">Schedule Changes:</label>
                  <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2">Must be approved in advance</div>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                  <span className="font-semibold">MUST COMPLETE {agreementData.weeklyRequirement}</span>
                </div>
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                  <span>Maintain detailed logs/records of packages completed</span>
                </div>
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                  <span>Submit records as requested by Company</span>
                </div>
              </div>
            </div>
          </div>

          {/* Communication & Reporting */}
          <div className="mb-8">
            <h3 className="bg-gray-200 text-gray-800 font-bold text-lg px-6 py-3 border-l-4 border-purple-600 mb-6">
              COMMUNICATION & REPORTING
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center mb-4">
                  <label className="w-40 font-semibold text-gray-700">Communication Channels:</label>
                  <div className="flex-1 border-b-2 border-gray-300 pb-1 px-2">{agreementData.communicationEmail}</div>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                  <span>Availability via email during work hours with timely responses</span>
                </div>
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                  <span className="font-normal">Join weekly video or phone check-ins</span>
                </div>
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                  <span>Submit weekly work summaries electronically</span>
                </div>
              </div>
            </div>
          </div>

          {/* Equipment Availability Check */}
          <div className="mb-8">
            <h3 className="bg-red-100 text-red-800 font-bold text-lg px-6 py-3 border-l-4 border-red-600 mb-6">
              EQUIPMENT AVAILABILITY CHECK
            </h3>
            


            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-red-800 mb-4">⚠️ Currently Out of Stock for Delivery:</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {outOfStockItems.map((item, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <div className="w-4 h-4 bg-red-500 rounded mr-3 flex-shrink-0 flex items-center justify-center">
                      <span className="text-white text-xs">✗</span>
                    </div>
                    <span className="text-red-700">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 mb-3">
                  <strong>Action Required:</strong> Some essential equipment is currently out of stock in our warehouse. 
                  To proceed with your agreement, you must request company payment authorization to purchase these items from a third-party vendor.
                </p>
                <p className="text-xs text-yellow-700">
                  The company will reimburse you for these items upon receipt of valid purchase documentation and prior approval.
                </p>
              </div>

              {!hasRequestedPayment ? (
                <button 
                  onClick={handleRequestPayment}
                  className="px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors font-bold bg-[#ff0000] pl-[50px] pr-[50px] pt-[20px] pb-[20px] text-[21px] text-[#000]"
                >Click Here to Request Company Payment for Third-Party Vendor Purchase</button>
              ) : (
                <div className="bg-green-100 border border-green-400 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-green-500 rounded-full mr-3 flex-shrink-0 flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <div>
                      <p className="font-semibold text-green-800">Payment Request Submitted</p>
                      <p className="text-sm text-green-700">You may now proceed to sign the agreement. Purchase authorization will be processed within 24 hours.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Equipment Purchase Confirmation */}
            {hasRequestedPayment && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                <h4 className="font-semibold text-blue-800 mb-4">Equipment Purchase Authorization</h4>
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="payment-confirmation"
                    checked={canProceedToSign}
                    onChange={(e) => setCanProceedToSign(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-2 border-blue-300 rounded focus:ring-blue-500 focus:ring-2 mt-1"
                  />
                  <label htmlFor="payment-confirmation" className="text-sm text-blue-800 leading-relaxed">
                    I confirm and acknowledge that I will receive a weekly company check in the amount of $225.00 training payment plus estimated fee to cover the equipment items not available in stock above and I agree to provide valid purchase receipts for reimbursement verification.
                  </label>
                </div>
              </div>
            )}

            {!canProceedToSign && (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                <p className="text-gray-700 font-medium">
                  ⚠️ You must request company payment and confirm the equipment purchase terms before signing the agreement.
                </p>
              </div>
            )}
          </div>

          {/* Signature Section */}
          <div className="border-t-2 border-purple-200 pt-8">
            <h3 className="bg-gray-200 text-gray-800 font-bold text-lg px-6 py-3 border-l-4 border-purple-600 mb-6">
              SIGNATURES
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Company Signature */}
              <div className="text-center">
                <div className="mb-4">
                  <div className="text-red-600 text-4xl mb-2">&#64744;</div>
                  <div className="font-bold text-lg">MM PACKAGING.</div>
                  <div className="font-semibold">ALEX PETER</div>
                  <div className="text-gray-600">MM. HR Manager</div>
                </div>
              </div>
              
              {/* Contractor Signature */}
              <div>
                <div className="border-2 border-gray-300 rounded-lg p-4 mb-4 bg-gray-50 relative">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={120}
                    className="w-full h-24 cursor-crosshair bg-white rounded"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                    {hasSignature ? (
                      <button 
                        onClick={clearSignature}
                        className="text-gray-600 hover:text-red-600"
                      >
                        Clear
                      </button>
                    ) : (
                      'Sign here'
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-semibold mb-1">NAME: {agreementData.signatureName}</div>
                  <div className="text-gray-600 mb-2">Date: {new Date().toLocaleDateString()}</div>
                  <div className="text-sm font-medium">MM. REMOTE INDEPENDENT PACKAGING CONTRACTOR</div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          {showSubmitButton && canProceedToSign && (
            <div className="mt-8 text-center bg-gray-50 p-6 rounded-lg border-2 border-purple-200">
              <p className="text-lg mb-4 text-gray-700">
                Please click submit to complete your agreement signature.
              </p>
              <button 
                onClick={handleSubmitSignature} 
                disabled={isSubmitting || !hasSignature || !canProceedToSign}
                className={`px-8 py-3 text-lg font-semibold rounded-lg transition-colors ${
                  isSubmitting || !hasSignature || !canProceedToSign
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700 cursor-pointer'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Agreement'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
