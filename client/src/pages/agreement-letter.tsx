
import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

export default function AgreementLetter() {
  const [, setLocation] = useLocation();

  // Check access on component mount and set up session timeout
  useEffect(() => {
    const hasAccess = sessionStorage.getItem('agl_access') === 'granted';
    const accessTime = sessionStorage.getItem('agl_access_time');
    
    if (!hasAccess) {
      setLocation('/agl-access');
      return;
    }
    
    // Check if access has expired (5 minutes for security)
    if (accessTime && Date.now() - parseInt(accessTime) > 900000) {
      sessionStorage.removeItem('agl_access');
      sessionStorage.removeItem('agl_access_time');
      setLocation('/agl-access');
      return;
    }
    
    // Set access time if not set
    if (!accessTime) {
      sessionStorage.setItem('agl_access_time', Date.now().toString());
    }
    
    // Set up automatic session timeout (5 minutes)
    const timeoutId = setTimeout(() => {
      sessionStorage.removeItem('agl_access');
      sessionStorage.removeItem('agl_access_time');
      alert('Your session has expired for security reasons. You will be redirected to the access page.');
      setLocation('/agl-access');
    }, 999000); // 5 minutes
    
    return () => clearTimeout(timeoutId);
  }, [setLocation]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitButton, setShowSubmitButton] = useState(false);

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
    if (hasSignature) {
      // Show submit button after user finishes drawing
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

  const handleSubmitSignature = async () => {
    if (!hasSignature) return;
    
    setIsSubmitting(true);
    
    try {
      // Send notification to Telegram bot
      await fetch('/api/notify-signature-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          clientIP: window.location.hostname
        })
      });

      // Clear the session and redirect back to code entry
      sessionStorage.removeItem('agl_access');
      sessionStorage.removeItem('agl_access_time');
      
      // Show success message and redirect
      alert('Agreement signed successfully! You will be redirected back to the code entry page.');
      setLocation('/agl-access');
    } catch (error) {
      alert('Error submitting signature. Please try again.');
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
    <div style={{ fontFamily: "'Times New Roman', 'Liberation Serif', 'DejaVu Serif', serif", margin: 0, padding: '20px', backgroundColor: '#fafafa', fontSize: '12px', lineHeight: 1.4 }}>
      <div style={{ width: '250mm', maxWidth: '250mm', margin: '0 auto', backgroundColor: 'white', border: '8px solid #fff', padding: 0, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ background: 'linear-gradient(135deg, #663399 0%, #cc6699 100%)', color: 'white', padding: '40px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', opacity: 0.3 }}></div>
          <div style={{ position: 'absolute', bottom: '-30px', right: '100px', width: '150px', height: '150px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', opacity: 0.5 }}></div>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '12px', color: '#ffcc66', marginBottom: '8px', letterSpacing: '2px' }}>MM. PACKAGING</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', lineHeight: 1.2, marginBottom: '4px' }}>Leading in Consumer<span style={{ color: '#ffcc66' }}> Packaging</span></div>
            <div style={{ fontSize: '11px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '8px' }}>FORM IC-2025 - INDEPENDENT CONTRACTOR AGREEMENT</div>
          </div>
        </div>
        
        <div style={{ padding: '15px' }}>
          <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', marginBottom: '15px', textDecoration: 'underline' }}>
            MM PACKAGING INDEPENDENT CONTRACTOR AGREEMENT
          </div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Company Name:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px', paddingLeft: '3px', fontSize: '10px' }}>MM Packaging (United States)</div>
          </div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Contractor Name:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px', paddingLeft: '3px', fontSize: '10px' }}> Macee Blossom   </div>
          </div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Agreement Effective Date:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '6px', paddingLeft: '3px', fontSize: '10px' }}>{new Date().toLocaleDateString()}</div>
          </div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Start Date:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '6px', paddingLeft: '3px', fontSize: '10px' }}>TBD</div>
          </div>
          
          <div style={{ backgroundColor: '#e0e0e0', padding: '8px', fontWeight: 'bold', fontSize: '12px', margin: '15px -15px 10px -15px', borderTop: '2px solid #000', borderBottom: '1px solid #000', letterSpacing: '0.5px' }}>POSITION & RESPONSIBILITIES</div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '11px', paddingRight: '8px', flexShrink: 0 }}>Job Title:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '18px', paddingLeft: '3px', fontSize: '11px' }}><strong>Packaging Associate (Independent Contractor)</strong></div>
          </div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Work Location:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px', paddingLeft: '3px', fontSize: '10px' }}>Fully Remote </div>
          </div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Eligibility:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px', paddingLeft: '3px', fontSize: '10px' }}>U.S. residents</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '8px 0', fontSize: '10px', lineHeight: '1.3' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '10px', flexShrink: 0, marginTop: '2px' }}></div>
            Primary Responsibilities: Sorting items for shipment, packing and assembling boxes, applying shipping labels, inspecting completed packages for accuracy and quality
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Performance Standards: Meet Company's productivity and quality standards (packages per week, error rates) as established in writing
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Must follow Company's written shipping and packing guidelines at all times
          </div>
          
          <div style={{ backgroundColor: '#e0e0e0', padding: '6px', fontWeight: 'bold', fontSize: '11px', margin: '15px -15px 10px -15px', borderTop: '2px solid #000', borderBottom: '1px solid #000' }}>TRAINING & START REQUIREMENTS</div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Training Period:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px', paddingLeft: '3px', fontSize: '10px' }}>Two Weeks</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Trainings: Company packing procedures, equipment use, ShipStation software, safety protocols
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Completion of training required before commencing independent work
          </div>
          <div style={{ fontSize: '9px', margin: '6px 0 6px 20px' }}>
            A payment of $225 per week will be provided during the training period. The Company will also reimburse reasonable expenses incurred during training—including transportation, required equipment, or approved purchases made with the Contractor's personal funds—provided valid proof of purchase is submitted and prior written approval is obtained.
          </div>
          
          <div style={{ backgroundColor: '#e0e0e0', padding: '6px', fontWeight: 'bold', fontSize: '11px', margin: '15px -15px 10px -15px', borderTop: '2px solid #000', borderBottom: '1px solid #000' }}>COMPENSATION & TAX STATUS</div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Payment Schedule:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px', paddingLeft: '3px', fontSize: '10px' }}>Weekly via check or direct deposit</div>
          </div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Rate:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px', paddingLeft: '3px', fontSize: '10px' }}>$1/ITEM</div>
          </div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Invoice Requirement:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px', paddingLeft: '3px', fontSize: '10px' }}>Weekly invoice/timesheet by Company deadline</div>
          </div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
       
          </div>
          
          <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', padding: '8px', margin: '12px 0', fontSize: '9px', color: '#856404' }}>
            <strong>INDEPENDENT CONTRACTOR STATUS:</strong> NO DEDUCTIONS FOR TAXES OR BENEFITS. CONTRACTOR RESPONSIBLE FOR ALL FEDERAL, STATE, AND LOCAL TAXES. NOT ELIGIBLE FOR EMPLOYEE BENEFITS (HEALTH INSURANCE, RETIREMENT, VACATION, SICK PAY). NO EMPLOYMENT RELATIONSHIP CREATED. NO OVERTIME PAY PROVIDED.
          </div>
          
          <div style={{ backgroundColor: '#e0e0e0', padding: '6px', fontWeight: 'bold', fontSize: '11px', margin: '15px -15px 10px -15px', borderTop: '2px solid #000', borderBottom: '1px solid #000' }}>EQUIPMENT & MATERIALS PROVIDED BY COMPANY</div>
          
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
                <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
                Shipping Materials:
              </div>
              <div style={{ fontSize: '9px', marginLeft: '20px' }}>
                • Shipping boxes (various sizes)<br />
                • Packaging void-fill (bubble wrap, packing peanuts)<br />
                • Packing tape and tape dispensers<br />
                • Box cutters and cutting tools
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
                <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
                Equipment & Software:
              </div>
              <div style={{ fontSize: '9px', marginLeft: '20px' }}>
                • Label printer with ShipStation software<br />
                • Inkjet printer with ink cartridges<br />
                • Digital scale for weighing packages<br />
                • Required software licenses for order-processing
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', padding: '8px', fontSize: '9px', color: '#856404' }}>
            <strong>NOTICE:</strong> Contractor must promptly report any malfunctioning, damaged, or depleted items. The Company will replace verified defective equipment or supplies. If specific standard items (e.g., printers, scales) are temporarily unavailable due to supply chain delays or manufacturer backorders, the Company may approve reimbursement for purchasing a commonly used equivalent product. <strong>Reimbursement is only permitted with prior written approval and valid proof of purchase.</strong>
          </div>
          
          <div style={{ backgroundColor: '#e0e0e0', padding: '6px', fontWeight: 'bold', fontSize: '11px', margin: '15px -15px 10px -15px', borderTop: '2px solid #000', borderBottom: '1px solid #000' }}>CONTRACTOR-PROVIDED ITEMS</div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Personal computer/device
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Clean, well-organized, and safe home workspace
          </div>
          
          <div style={{ backgroundColor: '#e0e0e0', padding: '6px', fontWeight: 'bold', fontSize: '11px', margin: '15px -15px 10px -15px', borderTop: '2px solid #000', borderBottom: '1px solid #000' }}>WORK SCHEDULE & PERFORMANCE</div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Typical Schedule:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px', paddingLeft: '3px', fontSize: '10px' }}> 500 Package Expected</div>
          </div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Schedule Changes:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px', paddingLeft: '3px', fontSize: '10px' }}>Must be approved in advance</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            MUST COMPLETE  500 ITEMS WEEKLY
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Maintain detailed logs/records of packages completed
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Submit records as requested by Company
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Will receive periodic feedback and informal performance reviews
          </div>
          
          <div style={{ backgroundColor: '#e0e0e0', padding: '6px', fontWeight: 'bold', fontSize: '11px', margin: '15px -15px 10px -15px', borderTop: '2px solid #000', borderBottom: '1px solid #000' }}>COMMUNICATION & REPORTING</div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Communication Channels:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px', paddingLeft: '3px', fontSize: '10px' }}>maceeblossom31@gmail.com</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Availability via email during work hours with timely responses
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            JOIN WEEKLY VIDEO OR PHONE CHECK-INS
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Submit weekly work summaries electronically
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Promptly notify Company of delays, equipment failures, or schedule impacts
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Document all work deliverables and enter tracking info into Company system daily
          </div>
          
          <div style={{ backgroundColor: '#e0e0e0', padding: '6px', fontWeight: 'bold', fontSize: '11px', margin: '15px -15px 10px -15px', borderTop: '2px solid #000', borderBottom: '1px solid #000' }}>CONFIDENTIALITY & DATA PROTECTION</div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            May handle confidential information: customer names, order details, shipping addresses, proprietary packing methods
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Agrees not to disclose confidential/proprietary information to third parties
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Comply with Non-Disclosure Agreement or confidentiality policies
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Safeguard physical/electronic records (packaging slips, shipping labels)
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Maintain password-protected, secured computer/device for Company work
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Must notify Company immediately of any security incidents or data breaches
          </div>
          
          <div style={{ backgroundColor: '#e0e0e0', padding: '6px', fontWeight: 'bold', fontSize: '11px', margin: '15px -15px 10px -15px', borderTop: '2px solid #000', borderBottom: '1px solid #000' }}>LIABILITY & SAFETY</div>
          
          <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', padding: '8px', margin: '12px 0', fontSize: '9px', color: '#856404' }}>
            <strong>INSURANCE NOTICE:</strong> Contractor NOT covered by Company's worker's compensation or liability insurance. Contractor must maintain required insurance (e.g., general liability) at own expense.
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Contractor liable for injury/property damage caused by own negligence
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Workspace Safety: Home workspace must comply with basic safety standards (clear walkways, proper ventilation, fire safety)
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Children/pets not allowed to handle packing materials or equipment
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Follow all safety guidelines (proper lifting techniques, keeping aisles clear, hazard-free workspace)
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Contractor assumes full responsibility for maintaining safe work environment
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Agrees to hold Company harmless from claims/damages arising from Contractor's negligence or misconduct
          </div>
          
          <div style={{ backgroundColor: '#e0e0e0', padding: '6px', fontWeight: 'bold', fontSize: '11px', margin: '15px -15px 10px -15px', borderTop: '2px solid #000', borderBottom: '1px solid #000' }}>TERMINATION & NOTICE</div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Termination Notice:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px', paddingLeft: '3px', fontSize: '10px' }}>15 days advance written notice required by either party</div>
          </div>
          
          <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: '180px', fontWeight: 'bold', fontSize: '10px', paddingRight: '8px', flexShrink: 0 }}>Immediate Termination:</div>
            <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px', paddingLeft: '3px', fontSize: '10px' }}>For material breach (confidentiality violation, failure to meet standards)</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Upon termination: Return all company-owned equipment, materials, and documents
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Submit final invoice for work completed through termination date
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0', fontSize: '9px' }}>
            <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}></div>
            Payment for undisputed work will be made per Payment Schedule above
          </div>
          
          <div style={{ padding: '1px', fontFamily: "'Courier New', monospace", fontSize: '10px' }}>
            <div style={{ backgroundColor: '#e0e0e0', padding: '6px', fontWeight: 'bold', fontSize: '11px', borderTop: '2px solid #000', borderBottom: '1px solid #000', margin: '15px -15px 10px -15px' }}>ACKNOWLEDGMENT</div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0' }}>
              <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0 }}></div>
              <div style={{ fontSize: '9px' }}>I understand this is an INDEPENDENT CONTRACTOR agreement, not employment</div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0' }}>
              <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0 }}></div>
              <div style={{ fontSize: '9px' }}>I acknowledge receipt of equipment and understand all guidelines</div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0' }}>
              <div style={{ width: '12px', height: '12px', border: '1px solid #000', marginRight: '8px', flexShrink: 0 }}></div>
              <div style={{ fontSize: '9px' }}>I agree to comply with all Company policies and applicable laws</div>
            </div>
            
            <div style={{ backgroundColor: '#e0e0e0', padding: '2px', fontWeight: 'bold', fontSize: '11px', margin: '15px -15px 10px -15px', borderTop: '2px solid #000', borderBottom: '1px solid #000' }}>LEGAL & GOVERNING LAW</div>

            <div style={{ fontSize: '9px', margin: '6px 0' }}>
              THIS AGREEMENT SHALL BE GOVERNED BY AND CONSTRUED IN ACCORDANCE WITH THE LAWS OF THE STATE, WITHOUT REGARD TO ITS CONFLICT OF LAW PRINCIPLES.
            </div>
            <div style={{ fontSize: '9px', margin: '6px 0' }}>
              ANY DISPUTES ARISING FROM THIS AGREEMENT SHALL FIRST BE ATTEMPTED TO BE RESOLVED THROUGH MEDIATION IN STATE. IF UNRESOLVED, DISPUTES SHALL BE SUBMITTED TO BINDING ARBITRATION IN ACCORDANCE WITH THE RULES OF THE AMERICAN ARBITRATION ASSOCIATION.
            </div>
            <div style={{ fontSize: '9px', margin: '6px 0' }}>
              THIS AGREEMENT REMAINS IN EFFECT UNTIL TERMINATED BY EITHER PARTY PER THE TERMINATION SECTION.
            </div>
            <div style={{ fontSize: '9px', margin: '6px 0' }}>
              CONTRACTOR AGREES NOT TO ENGAGE IN COMPETING PACKAGING SERVICES DURING THE TERM OF THIS AGREEMENT AND FOR A PERIOD OF 1 YEAR AFTER TERMINATION WITHOUT WRITTEN CONSENT FROM COMPANY.
            </div>
            <div style={{ fontSize: '9px', margin: '6px 0' }}>
              ELECTRONIC SIGNATURES ARE LEGALLY VALID.
            </div>

            <div style={{ fontSize: '9px', margin: '6px 0' }}>
              ALL WORK PRODUCTS, DOCUMENTATION, PROCESSES, AND MATERIALS CREATED BY THE CONTRACTOR FOR THE COMPANY SHALL BE THE SOLE PROPERTY OF THE COMPANY.
            </div>
            <div style={{ fontSize: '9px', margin: '6px 0' }}>
              NEITHER PARTY SHALL BE LIABLE FOR FAILURE TO PERFORM DUE TO EVENTS BEYOND REASONABLE CONTROL, INCLUDING ACTS OF GOD, WAR, OR NATURAL DISASTERS.
            </div>
            <div style={{ fontSize: '9px', margin: '6px 0' }}>
              IF ANY PROVISION OF THIS AGREEMENT IS FOUND TO BE UNENFORCEABLE, THE REMAINDER SHALL CONTINUE IN FULL FORCE AND EFFECT.
            </div>
            <div style={{ fontSize: '9px', margin: '6px 0' }}>
              THIS DOCUMENT REPRESENTS THE ENTIRE AGREEMENT. ANY CHANGES MUST BE MADE IN WRITING AND SIGNED BY BOTH PARTIES.
            </div>
            <br />
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, marginRight: '20px' }}>
                <div style={{ height: '20px', marginBottom: '4px' }}></div>
                <div style={{ color: 'red', fontSize: '32px' }}>&#64744;</div>
                <div style={{ fontWeight: 'bold' }}>MM PACKAGING.</div>
                <div style={{ fontWeight: 'bold' }}>ALEX PETER</div>
                <div>MM. HR Manager</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  border: '1px solid #000', 
                  height: '80px', 
                  marginBottom: '4px', 
                  position: 'relative',
                  backgroundColor: '#fafafa'
                }}>
                  <canvas
                    ref={canvasRef}
                    width={300}
                    height={78}
                    style={{
                      width: '100%',
                      height: '100%',
                      cursor: 'crosshair',
                      display: 'block'
                    }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    fontSize: '8px',
                    color: '#666',
                    backgroundColor: 'white',
                    padding: '1px 3px',
                    border: '1px solid #ccc'
                  }}>
                    {hasSignature ? (
                      <button 
                        onClick={clearSignature}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#666',
                          fontSize: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        Clear
                      </button>
                    ) : (
                      'Sign here'
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '9px' }}>SIGNATURE</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>NAME: Macee Blossom</div>
                    <div>Date: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', marginTop: '4px' }}>MM. REMOTE INDEPENDENT PACKAGING CONTRACTOR</div>
              </div>
            </div>
          </div>
          
          {/* Submit Button Section */}
          {showSubmitButton && (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              borderTop: '2px solid #663399',
              backgroundColor: '#f8f9fa'
            }}>
              <p style={{ 
                fontSize: '14px', 
                marginBottom: '15px',
                color: '#333'
              }}>
                Please click submit to complete your agreement signature.
              </p>
              <Button 
                onClick={handleSubmitSignature} 
                disabled={isSubmitting || !hasSignature}
                style={{
                  backgroundColor: isSubmitting ? '#ccc' : '#663399',
                  color: 'white',
                  padding: '12px 30px',
                  fontSize: '16px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Agreement'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
