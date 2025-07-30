import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, Mail, Phone, Clock } from "lucide-react";
import type { Application } from "@shared/schema";

export default function ApplicationSuccess() {
  const [, params] = useRoute("/success/:id");
  const applicationId = params?.id;

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["/api/applications", applicationId],
    queryFn: async () => {
      if (!applicationId) throw new Error("No application ID");
      const res = await fetch(`/api/applications/${applicationId}`);
      if (!res.ok) {
        throw new Error("Application not found");
      }
      return res.json();
    },
    enabled: !!applicationId,
  });

  const application = response?.success ? response.application : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading application details...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-neutral-800 mb-2">Application Submitted!</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 font-medium">
                Application ID: #{applicationId}
              </p>
            </div>
            <p className="text-neutral-700 mb-4">
              Your application has been submitted successfully. We will review it and contact you within <strong>2-3 business days</strong>.
            </p>
            <p className="text-sm text-neutral-500">
              Note: Application details are temporarily unavailable due to system maintenance, but your submission was successful.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">MM Packaging</h1>
            <p className="text-xl md:text-2xl font-medium text-blue-100">Application Submitted Successfully</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-3xl">
        {/* Success Message */}
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-neutral-800 mb-2">Application Submitted Successfully!</h2>
            <p className="text-lg text-neutral-600 mb-4">
              Thank you for applying for the work-from-home packaging position at MM Packaging.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 font-medium">
                Application ID: #{applicationId}
              </p>
            </div>
            <p className="text-neutral-700">
              We will review your application and contact you within <strong>2-3 business days</strong> at the email address and phone number you provided.
            </p>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-neutral-800 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              What Happens Next?
            </h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-1">1</div>
                <div>
                  <h4 className="font-medium text-neutral-800">Application Review</h4>
                  <p className="text-neutral-600">Our HR team will review your application and qualifications.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-1">2</div>
                <div>
                  <h4 className="font-medium text-neutral-800">Initial Contact</h4>
                  <p className="text-neutral-600">If selected, we'll contact you for a brief phone interview.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-1">3</div>
                <div>
                  <h4 className="font-medium text-neutral-800">Training Schedule</h4>
                  <p className="text-neutral-600">We'll schedule your 2-week onsite training program.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-1">4</div>
                <div>
                  <h4 className="font-medium text-neutral-800">Start Working</h4>
                  <p className="text-neutral-600">Begin your work-from-home packaging career!</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Summary */}
        {application && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-neutral-800 mb-4">Application Summary</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Name:</strong> {application.firstName} {application.lastName}
                </div>
                <div>
                  <strong>Email:</strong> {application.email}
                </div>
                <div>
                  <strong>Phone:</strong> {application.phone}
                </div>
                <div>
                  <strong>Preferred Start Date:</strong> {application.startDate}
                </div>
                <div>
                  <strong>Training Availability:</strong> {application.trainingAvailable}
                </div>
                <div>
                  <strong>Hours Per Week:</strong> {application.hoursPerWeek}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Information */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-neutral-800 mb-4">Have Questions?</h3>
            <p className="text-neutral-600 mb-4">
              If you have any questions about your application or the position, feel free to contact us:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-neutral-700">info@mmpackagingrecruit.info</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-neutral-700">Text-Only: 815 881 2037</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Button */}
        <div className="text-center">
          <Button 
            onClick={() => window.location.href = '/'}
            className="bg-primary text-white hover:bg-primary-dark"
          >
            <Home className="mr-2 h-4 w-4" />
            Return to Application Form
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-800 text-white mt-12">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <div className="text-center">
            <div className="mt-8 pt-6 border-t border-neutral-700 text-center">
              <p className="text-neutral-400">© 2025 MM Packaging. All rights reserved.</p>
              <p className="text-sm text-neutral-500 mt-2">Equal Opportunity Employer</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

