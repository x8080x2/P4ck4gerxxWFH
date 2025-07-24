import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { insertApplicationSchema, type InsertApplication } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Check, 
  Star, 
  ListTodo, 
  AlertTriangle, 
  CloudUpload, 
  FileText,
  Mail,
  Phone,
  Globe,
  NotebookPen
} from "lucide-react";

export default function ApplicationForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  const form = useForm<InsertApplication>({
    resolver: zodResolver(insertApplicationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      experience: "",
      previousJobs: "",
      trainingAvailable: "",
      startDate: "",
      hoursPerWeek: "",
      workspaceSpace: "",
      workspaceDescription: "",
      trainingAgreement: "false",
      workspaceAgreement: "false",
      reliabilityAgreement: "false",
      privacyAgreement: "false",
    },
  });

  const submitApplication = useMutation({
    mutationFn: async (data: InsertApplication) => {
      const formData = new FormData();
      
      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      
      // Add files
      if (resumeFile) {
        formData.append('resume', resumeFile);
      }
      
      additionalFiles.forEach((file) => {
        formData.append('additionalDocs', file);
      });

      const response = await fetch("/api/applications", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit application");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Application Submitted!",
        description: "We will review your application and contact you within 2-3 business days.",
      });
      setLocation(`/success/${data.applicationId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertApplication) => {
    submitApplication.mutate(data);
  };

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">MM Packaging</h1>
            <p className="text-xl md:text-2xl font-medium text-blue-100">Work from Home Opportunity</p>
          </div>
        </div>
      </header>

      {/* Job Posting Banner */}
      <section className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 md:p-8 border border-blue-100">
            <h2 className="text-2xl font-bold text-neutral-800 mb-4">Join MM Packaging - Work from Home!</h2>
            <p className="text-lg text-neutral-700 mb-6">We are hiring reliable individuals to pack and arrange boxes from home.</p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-neutral-800 flex items-center">
                  <Star className="h-5 w-5 text-warning mr-2" />
                  Benefits
                </h3>
                <ul className="space-y-2 text-neutral-700">
                  <li className="flex items-start"><Check className="h-4 w-4 text-success mr-2 mt-1" />2 Weeks Paid Training (Onsite)</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-success mr-2 mt-1" />Start Working from Home After Training</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-success mr-2 mt-1" />No Experience Needed</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-success mr-2 mt-1" />All Materials Provided</li>
                  <li className="flex items-start"><Check className="h-4 w-4 text-success mr-2 mt-1" />Competitive Pay</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-neutral-800 flex items-center">
                  <ListTodo className="h-5 w-5 text-secondary mr-2" />
                  Job Responsibilities
                </h3>
                <ul className="space-y-2 text-neutral-700">
                  <li className="flex items-start"><div className="w-2 h-2 bg-neutral-400 rounded-full mr-2 mt-2" />Sort and prepare items</li>
                  <li className="flex items-start"><div className="w-2 h-2 bg-neutral-400 rounded-full mr-2 mt-2" />Pack boxes securely</li>
                  <li className="flex items-start"><div className="w-2 h-2 bg-neutral-400 rounded-full mr-2 mt-2" />Label, seal, and inspect shipments</li>
                  <li className="flex items-start"><div className="w-2 h-2 bg-neutral-400 rounded-full mr-2 mt-2" />Follow company SOP and checklist</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-800 font-medium flex items-center">
                <AlertTriangle className="h-5 w-5 text-warning mr-2" />
                Limited slots available - Apply today!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <main className="container mx-auto px-6 py-8 max-w-3xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Personal Information */}
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center mb-6">
                  <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-3">1</div>
                  <h3 className="text-xl font-semibold text-neutral-800">Personal Information</h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name <span className="text-error">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name <span className="text-error">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address <span className="text-error">*</span></FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number <span className="text-error">*</span></FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="123-456-7890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Home Address <span className="text-error">*</span></FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter your complete home address" 
                            className="resize-none" 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Work Experience */}
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center mb-6">
                  <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-3">2</div>
                  <h3 className="text-xl font-semibold text-neutral-800">Work Experience</h3>
                </div>
                
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Previous Work Experience</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} defaultValue={field.value}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="none" id="none" />
                              <Label htmlFor="none">No previous work experience</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="some" id="some" />
                              <Label htmlFor="some">Some work experience (less than 2 years)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="experienced" id="experienced" />
                              <Label htmlFor="experienced">Experienced (2+ years)</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="previousJobs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Briefly describe your previous jobs (if any)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your work history, including packaging, warehouse, or similar experience..." 
                            className="resize-none" 
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Availability & Training */}
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center mb-6">
                  <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-3">3</div>
                  <h3 className="text-xl font-semibold text-neutral-800">Availability & Training</h3>
                </div>
                
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="trainingAvailable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Can you attend our 2-week onsite training program? <span className="text-error">*</span></FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} defaultValue={field.value}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="training-yes" />
                              <Label htmlFor="training-yes">Yes, I can attend the full 2-week onsite training</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="partial" id="training-partial" />
                              <Label htmlFor="training-partial">I have some scheduling conflicts but can accommodate</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="training-no" />
                              <Label htmlFor="training-no">No, I cannot attend onsite training</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Start Date <span className="text-error">*</span></FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="hoursPerWeek"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hours Available Per Week <span className="text-error">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select hours per week" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="10-20">10-20 hours</SelectItem>
                              <SelectItem value="20-30">20-30 hours</SelectItem>
                              <SelectItem value="30-40">30-40 hours</SelectItem>
                              <SelectItem value="40+">40+ hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Home Workspace */}
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center mb-6">
                  <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-3">4</div>
                  <h3 className="text-xl font-semibold text-neutral-800">Home Workspace</h3>
                </div>
                
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="workspaceSpace"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Do you have adequate space at home for packaging work? <span className="text-error">*</span></FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} defaultValue={field.value}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="workspace-yes" />
                              <Label htmlFor="workspace-yes">Yes, I have a dedicated workspace (garage, basement, spare room)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="limited" id="workspace-limited" />
                              <Label htmlFor="workspace-limited">Limited space but can accommodate packaging work</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="workspace-no" />
                              <Label htmlFor="workspace-no">No, I don't have adequate space</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="workspaceDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Describe your available workspace</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the space you have available for packaging work (size, location, storage capacity)..." 
                            className="resize-none" 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Workspace Requirements</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Clean, dry area for packaging materials</li>
                      <li>• Good lighting for quality inspection</li>
                      <li>• Storage space for boxes and supplies</li>
                      <li>• Access for material delivery and pickup</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center mb-6">
                  <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-3">5</div>
                  <h3 className="text-xl font-semibold text-neutral-800">Documents</h3>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <Label className="block text-sm font-medium text-neutral-700 mb-2">
                      Upload Resume (Optional)
                    </Label>
                    <FileUpload
                      accept=".pdf,.doc,.docx"
                      maxSize={5 * 1024 * 1024}
                      onFileSelect={setResumeFile}
                      multiple={false}
                      icon={<CloudUpload className="h-8 w-8" />}
                      description="Drag and drop your resume here, or click to browse"
                      acceptText="Accepted formats: PDF, DOC, DOCX (Max 5MB)"
                    />
                  </div>
                  
                  <div>
                    <Label className="block text-sm font-medium text-neutral-700 mb-2">
                      Additional Documents (Optional)
                    </Label>
                    <FileUpload
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      maxSize={5 * 1024 * 1024}
                      onFileSelect={(files) => setAdditionalFiles(Array.isArray(files) ? files : [files])}
                      multiple={true}
                      icon={<FileText className="h-8 w-8" />}
                      description="Upload any additional documents (references, certifications, etc.)"
                      acceptText="Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 5MB each)"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agreement */}
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center mb-6">
                  <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-3">6</div>
                  <h3 className="text-xl font-semibold text-neutral-800">Agreement & Confirmation</h3>
                </div>
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="trainingAgreement"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value === "true"}
                            onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <Label>
                            <strong>Training Commitment:</strong> I understand and agree to attend the full 2-week onsite training program as a requirement for this position. <span className="text-error">*</span>
                          </Label>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="workspaceAgreement"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value === "true"}
                            onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <Label>
                            <strong>Workspace Verification:</strong> I confirm that I have adequate space at home for packaging work and can provide a clean, organized workspace. <span className="text-error">*</span>
                          </Label>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="reliabilityAgreement"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value === "true"}
                            onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <Label>
                            <strong>Reliability Commitment:</strong> I understand that this position requires attention to detail, reliability, and the ability to follow company SOPs and quality standards. <span className="text-error">*</span>
                          </Label>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="privacyAgreement"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value === "true"}
                            onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <Label>
                            <strong>Privacy Policy:</strong> I agree to MM Packaging's privacy policy and consent to the collection and processing of my personal information for employment purposes. <span className="text-error">*</span>
                          </Label>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="text-center space-y-4">
                  <Button 
                    type="submit" 
                    disabled={submitApplication.isPending}
                    className="bg-primary text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-dark focus:ring-4 focus:ring-blue-200 transition duration-200 transform hover:scale-105"
                  >
                    {submitApplication.isPending ? (
                      "Submitting..."
                    ) : (
                      <>
                        <NotebookPen className="mr-2 h-4 w-4" />
                        Submit Application
                      </>
                    )}
                  </Button>
                  
                  <p className="text-sm text-neutral-600">
                    By submitting this application, you agree to our terms and conditions.
                    <br />We will review your application and contact you within 2-3 business days.
                  </p>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-800 text-white">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Questions? Contact Us</h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <Mail className="h-8 w-8 text-blue-400 mx-auto" />
                <h4 className="font-medium">Email</h4>
                <p className="text-neutral-300">your@email.com</p>
              </div>
              
              <div className="space-y-2">
                <Phone className="h-8 w-8 text-green-400 mx-auto" />
                <h4 className="font-medium">Phone / WhatsApp</h4>
                <p className="text-neutral-300">123-456-7890</p>
              </div>
              
              <div className="space-y-2">
                <Globe className="h-8 w-8 text-purple-400 mx-auto" />
                <h4 className="font-medium">Website</h4>
                <p className="text-neutral-300">mm.group/packaging/</p>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-neutral-700 text-center">
              <p className="text-neutral-400">© 2024 MM Packaging. All rights reserved.</p>
              <p className="text-sm text-neutral-500 mt-2">Equal Opportunity Employer</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
