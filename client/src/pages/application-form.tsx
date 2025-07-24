import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { insertApplicationSchema, type InsertApplication } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  NotebookPen,
  User,
  Briefcase,
  Calendar,
  Upload,
  Shield
} from "lucide-react";

export default function ApplicationForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [currentTab, setCurrentTab] = useState("info");

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
      trainingAgreement: "false" as "true",
      workspaceAgreement: "false" as "true",
      reliabilityAgreement: "false" as "true",
      privacyAgreement: "false" as "true",
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

  const handleNextTab = () => {
    const tabs = ["info", "experience", "availability", "documents", "agreements"];
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex < tabs.length - 1) {
      setCurrentTab(tabs[currentIndex + 1]);
    }
  };

  const handlePrevTab = () => {
    const tabs = ["info", "experience", "availability", "documents", "agreements"];
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex > 0) {
      setCurrentTab(tabs[currentIndex - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Compact Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-1">MM Packaging</h1>
            <p className="text-lg text-blue-100">Work from Home Application</p>
          </div>
        </div>
      </header>

      {/* Compact Job Overview */}
      <section className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-6 py-6 max-w-6xl">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="grid lg:grid-cols-3 gap-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-800 mb-3">Join Our Team!</h2>
                <p className="text-neutral-700">Pack and arrange boxes from home with competitive pay and full training.</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-neutral-800 flex items-center text-sm">
                  <Star className="h-4 w-4 text-warning mr-2" />
                  Benefits
                </h3>
                <ul className="space-y-1 text-sm text-neutral-700">
                  <li className="flex items-center"><Check className="h-3 w-3 text-success mr-2" />2 Weeks Paid Training</li>
                  <li className="flex items-center"><Check className="h-3 w-3 text-success mr-2" />Work from Home</li>
                  <li className="flex items-center"><Check className="h-3 w-3 text-success mr-2" />No Experience Needed</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-neutral-800 flex items-center text-sm">
                  <ListTodo className="h-4 w-4 text-secondary mr-2" />
                  Responsibilities
                </h3>
                <ul className="space-y-1 text-sm text-neutral-700">
                  <li className="flex items-start"><div className="w-1.5 h-1.5 bg-neutral-400 rounded-full mr-2 mt-2" />Sort and prepare items</li>
                  <li className="flex items-start"><div className="w-1.5 h-1.5 bg-neutral-400 rounded-full mr-2 mt-2" />Pack boxes securely</li>
                  <li className="flex items-start"><div className="w-1.5 h-1.5 bg-neutral-400 rounded-full mr-2 mt-2" />Follow company procedures</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
              <p className="text-orange-800 font-medium flex items-center text-sm">
                <AlertTriangle className="h-4 w-4 text-warning mr-2" />
                Limited slots available - Apply today!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-center text-neutral-800">Application Form</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-5 mb-6">
                    <TabsTrigger value="info" className="flex items-center gap-1 text-xs">
                      <User className="h-3 w-3" />
                      Info
                    </TabsTrigger>
                    <TabsTrigger value="experience" className="flex items-center gap-1 text-xs">
                      <Briefcase className="h-3 w-3" />
                      Experience
                    </TabsTrigger>
                    <TabsTrigger value="availability" className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      Availability
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex items-center gap-1 text-xs">
                      <Upload className="h-3 w-3" />
                      Documents
                    </TabsTrigger>
                    <TabsTrigger value="agreements" className="flex items-center gap-1 text-xs">
                      <Shield className="h-3 w-3" />
                      Agreements
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
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
                              rows={2}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="experience" className="space-y-6">
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
                              rows={3}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="availability" className="space-y-6">
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
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Start Date <span className="text-error">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select start date" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="immediately">Immediately</SelectItem>
                                <SelectItem value="1-week">Within 1 week</SelectItem>
                                <SelectItem value="2-weeks">Within 2 weeks</SelectItem>
                                <SelectItem value="1-month">Within 1 month</SelectItem>
                                <SelectItem value="flexible">I'm flexible</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="hoursPerWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Available Hours Per Week <span className="text-error">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select hours" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="part-time">Part-time (20-30 hours)</SelectItem>
                                <SelectItem value="full-time">Full-time (40 hours)</SelectItem>
                                <SelectItem value="flexible">Flexible hours</SelectItem>
                                <SelectItem value="weekends">Weekends only</SelectItem>
                                <SelectItem value="evenings">Evenings only</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="workspaceSpace"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Do you have adequate space at home for packaging work? <span className="text-error">*</span></FormLabel>
                            <FormControl>
                              <RadioGroup onValueChange={field.onChange} defaultValue={field.value}>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="yes" id="space-yes" />
                                  <Label htmlFor="space-yes">Yes, I have adequate space</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="limited" id="space-limited" />
                                  <Label htmlFor="space-limited">Limited space but manageable</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="no" id="space-no" />
                                  <Label htmlFor="space-no">No, I need to arrange space</Label>
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
                            <FormLabel>Briefly describe your workspace</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe your home workspace for packaging..." 
                                className="resize-none" 
                                rows={3}
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-base font-medium mb-3 block">Resume Upload</Label>
                        <FileUpload
                          accept=".pdf,.doc,.docx"
                          maxSize={5 * 1024 * 1024}
                          onFileSelect={(file) => setResumeFile(file as File)}
                          icon={<FileText className="h-8 w-8" />}
                          description="Upload your resume"
                          acceptText="Accepted: PDF, DOC, DOCX (Max 5MB)"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-base font-medium mb-3 block">Additional Documents (Optional)</Label>
                        <FileUpload
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          maxSize={5 * 1024 * 1024}
                          multiple
                          onFileSelect={(files) => setAdditionalFiles(files as File[])}
                          icon={<CloudUpload className="h-8 w-8" />}
                          description="Upload additional documents"
                          acceptText="Accepted: PDF, DOC, DOCX, JPG, PNG (Max 5MB each, up to 5 files)"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="agreements" className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="trainingAgreement"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value === "true"}
                                onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Training Commitment <span className="text-error">*</span></FormLabel>
                              <p className="text-sm text-neutral-600">
                                I commit to attending the full 2-week onsite training program and understand it's mandatory for this position.
                              </p>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="workspaceAgreement"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value === "true"}
                                onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Workspace Requirements <span className="text-error">*</span></FormLabel>
                              <p className="text-sm text-neutral-600">
                                I confirm that I have or will arrange adequate space at home for packaging work.
                              </p>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="reliabilityAgreement"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value === "true"}
                                onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Reliability Commitment <span className="text-error">*</span></FormLabel>
                              <p className="text-sm text-neutral-600">
                                I understand this is a serious work commitment and agree to be reliable and follow all company procedures.
                              </p>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="privacyAgreement"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value === "true"}
                                onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Privacy Policy <span className="text-error">*</span></FormLabel>
                              <p className="text-sm text-neutral-600">
                                I agree to MM Packaging's privacy policy and consent to the collection and processing of my personal data for employment purposes.
                              </p>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6 border-t">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handlePrevTab}
                      disabled={currentTab === "info"}
                    >
                      Previous
                    </Button>
                    
                    {currentTab === "agreements" ? (
                      <Button 
                        type="submit" 
                        disabled={submitApplication.isPending}
                        className="bg-primary text-white hover:bg-primary-dark"
                      >
                        {submitApplication.isPending ? "Submitting..." : "Submit Application"}
                      </Button>
                    ) : (
                      <Button 
                        type="button" 
                        onClick={handleNextTab}
                        className="bg-primary text-white hover:bg-primary-dark"
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </Tabs>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-800 text-white mt-8">
        <div className="container mx-auto px-6 py-6 max-w-4xl">
          <div className="text-center">
            <div className="grid md:grid-cols-3 gap-4 mb-4 text-sm">
              <div className="flex items-center justify-center">
                <Mail className="h-4 w-4 text-blue-400 mr-2" />
                <span>your@email.com</span>
              </div>
              <div className="flex items-center justify-center">
                <Phone className="h-4 w-4 text-green-400 mr-2" />
                <span>123-456-7890</span>
              </div>
              <div className="flex items-center justify-center">
                <Globe className="h-4 w-4 text-purple-400 mr-2" />
                <span>mm.group/packaging</span>
              </div>
            </div>
            <div className="pt-4 border-t border-neutral-700 text-center">
              <p className="text-neutral-400 text-sm">© 2024 MM Packaging. All rights reserved.</p>
              <p className="text-xs text-neutral-500 mt-1">Equal Opportunity Employer</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}