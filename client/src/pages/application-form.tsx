import { useState, useEffect } from "react";
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
import { FormProgress } from "@/components/ui/form-progress";
import { LoadingOverlay, SuccessAnimation } from "@/components/ui/success-animation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { compressImage, isImageFile } from "@/lib/image-compression";
import { formSubmissionLimiter } from "@/lib/rate-limiting";
import heroPackagingImage from "@/assets/hero-packaging.svg";
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
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [currentTab, setCurrentTab] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertApplicationSchema),
    mode: "onChange",
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
      reliabilityAgreement: "false",
      privacyAgreement: "false",
    },
  });

  // Simple tab completion checker without reactive updates
  const getCompletedTabs = () => {
    const values = form.getValues();
    const errors = form.formState.errors;
    const newCompletedTabs: string[] = [];

    // Info tab
    if (values.firstName && values.lastName && values.email && values.phone && values.address && 
        !errors.firstName && !errors.lastName && !errors.email && !errors.phone && !errors.address) {
      newCompletedTabs.push("info");
    }

    // Experience tab (optional fields)
    if (values.experience) {
      newCompletedTabs.push("experience");
    }

    // Availability tab
    if (values.trainingAvailable && values.startDate && values.hoursPerWeek && values.workspaceSpace &&
        !errors.trainingAvailable && !errors.startDate && !errors.hoursPerWeek && !errors.workspaceSpace) {
      newCompletedTabs.push("availability");
    }

    // Documents tab
    if (idFrontFile && idBackFile) {
      newCompletedTabs.push("documents");
    }

    // Agreements tab
    if (values.trainingAgreement === "true" && values.reliabilityAgreement === "true" && values.privacyAgreement === "true") {
      newCompletedTabs.push("agreements");
    }

    return newCompletedTabs;
  };

  // Handle file compression
  const handleFileSelect = async (file: File, type: 'front' | 'back') => {
    if (!file) return;

    setIsCompressing(true);
    try {
      let processedFile = file;
      
      if (isImageFile(file)) {
        processedFile = await compressImage(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          quality: 0.8
        });
        
        toast({
          title: "Image Compressed",
          description: `File size reduced from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`,
        });
      }

      if (type === 'front') {
        setIdFrontFile(processedFile);
      } else {
        setIdBackFile(processedFile);
      }
    } catch (error) {
      toast({
        title: "Compression Failed",
        description: "Using original file instead.",
        variant: "destructive",
      });
      
      if (type === 'front') {
        setIdFrontFile(file);
      } else {
        setIdBackFile(file);
      }
    } finally {
      setIsCompressing(false);
    }
  };

  const submitApplication = useMutation({
    mutationFn: async (data: InsertApplication) => {
      const formData = new FormData();

      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      // Add ID files
      if (idFrontFile) {
        formData.append('idFront', idFrontFile);
      }

      if (idBackFile) {
        formData.append('idBack', idBackFile);
      }

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
      console.log('Form validation errors:', form.formState.errors);
      toast({
        title: "Form Validation Error",
        description: "Please check all required fields and fix any errors.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertApplication) => {
    // Rate limiting check
    const userKey = `${data.email}_${data.phone}`;
    if (!formSubmissionLimiter.canAttempt(userKey)) {
      const remainingTime = formSubmissionLimiter.getRemainingTime(userKey);
      const minutes = Math.ceil(remainingTime / 60000);
      
      toast({
        title: "Too Many Attempts",
        description: `Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before submitting again.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      // Add ID files
      if (idFrontFile) {
        formData.append('idFront', idFrontFile);
      }
      if (idBackFile) {
        formData.append('idBack', idBackFile);
      }

      console.log('Form submission data:', data);
      console.log('ID Front File:', idFrontFile);
      console.log('ID Back File:', idBackFile);

      const response = await fetch('/api/applications', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        formSubmissionLimiter.recordAttempt(userKey);
        setShowSuccessAnimation(true);
        
        // Navigate after animation
        setTimeout(() => {
          setLocation(`/success/${result.applicationId}`);
        }, 2500);
      } else {
        throw new Error(result.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-purple-800 to-orange-500 text-white py-20">
        <div className="absolute inset-0">
          {/* Geometric background elements inspired by MM Packaging design */}
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-orange-400/20 rotate-45 rounded-2xl"></div>
          <div className="absolute bottom-1/3 left-1/4 w-24 h-24 bg-purple-400/20 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-white/10 rotate-12 rounded-lg"></div>
          <div className="absolute top-16 left-16 w-20 h-20 bg-orange-300/15 rounded-full"></div>
        </div>
        <div className="relative container mx-auto px-6 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-orange-300 text-sm font-semibold tracking-wider uppercase">MM. PACKAGING</p>
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  Leading in Consumer<br />
                  <span className="text-orange-300">Packaging</span>
                </h1>
              </div>
              <p className="text-xl text-purple-100 leading-relaxed max-w-lg">
                Join our team creating innovative packaging solutions for pharmaceuticals, food & beverages, beauty & personal care, and premium consumer goods worldwide.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <Star className="h-5 w-5 text-orange-300 mr-2" />
                  <span className="text-sm font-medium">Work From Home</span>
                </div>
                <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <Check className="h-5 w-5 text-orange-300 mr-2" />
                  <span className="text-sm font-medium">2 Weeks Paid Training</span>
                </div>
                <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <Check className="h-5 w-5 text-orange-300 mr-2" />
                  <span className="text-sm font-medium">No Experience Needed</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative z-10 flex justify-center">
                <img 
                  src={heroPackagingImage} 
                  alt="MM Packaging Products" 
                  className="w-full h-auto max-w-lg mx-auto drop-shadow-2xl"
                />
              </div>
              {/* Additional geometric shapes for visual interest */}
              <div className="absolute top-8 right-8 w-20 h-20 bg-orange-400/20 rotate-45 rounded-lg"></div>
              <div className="absolute bottom-8 left-8 w-16 h-16 bg-purple-400/20 rounded-full"></div>
            </div>
          </div>
        </div>
      </section>
      {/* Professional Job Overview */}
      <section className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-6 py-8 max-w-6xl">
          <div className="grid lg:grid-cols-4 gap-8 mb-6">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-neutral-800 mb-4">About This Position</h2>
              <p className="text-neutral-700 mb-4">
                MM Packaging develops and produces packaging solutions worldwide. Join our team as a work-from-home packaging specialist and be part of our commitment to innovative packaging solutions.
              </p>
              <div className="bg-blue-50 border-l-4 border-primary p-4 rounded-r">
                <p className="text-blue-800 font-medium flex items-center text-sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Limited positions available - Apply today!
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-neutral-800 flex items-center">
                <Star className="h-5 w-5 text-warning mr-2" />
                Key Benefits
              </h3>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li className="flex items-center"><Check className="h-4 w-4 text-success mr-2" />2 Weeks Paid Training (Onsite)</li>
                <li className="flex items-center"><Check className="h-4 w-4 text-success mr-2" />Work from Home After Training</li>
                <li className="flex items-center"><Check className="h-4 w-4 text-success mr-2" />All Materials Provided</li>
                <li className="flex items-center"><Check className="h-4 w-4 text-success mr-2" />Competitive Pay</li>
                <li className="flex items-center"><Check className="h-4 w-4 text-success mr-2" />No Experience Required</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-neutral-800 flex items-center">
                <ListTodo className="h-5 w-5 text-secondary mr-2" />
                Your Role
              </h3>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li className="flex items-start"><div className="w-2 h-2 bg-secondary rounded-full mr-2 mt-2" />Sort and prepare items</li>
                <li className="flex items-start"><div className="w-2 h-2 bg-secondary rounded-full mr-2 mt-2" />Pack boxes securely</li>
                <li className="flex items-start"><div className="w-2 h-2 bg-secondary rounded-full mr-2 mt-2" />Label, seal, and inspect shipments</li>
                <li className="flex items-start"><div className="w-2 h-2 bg-secondary rounded-full mr-2 mt-2" />Follow company SOP and checklist</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {/* Application Form */}
      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl text-center text-neutral-800">Application Form</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit as any)}>
                <FormProgress currentTab={currentTab} completedTabs={getCompletedTabs()} />
                <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-5 mb-6 h-auto">
                    <TabsTrigger value="info" className="flex flex-col sm:flex-row items-center gap-1 text-xs p-2 sm:p-3">
                      <User className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Info</span>
                      <span className="sm:hidden">1</span>
                    </TabsTrigger>
                    <TabsTrigger value="experience" className="flex flex-col sm:flex-row items-center gap-1 text-xs p-2 sm:p-3">
                      <Briefcase className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Experience</span>
                      <span className="sm:hidden">2</span>
                    </TabsTrigger>
                    <TabsTrigger value="availability" className="flex flex-col sm:flex-row items-center gap-1 text-xs p-2 sm:p-3">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Availability</span>
                      <span className="sm:hidden">3</span>
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex flex-col sm:flex-row items-center gap-1 text-xs p-2 sm:p-3">
                      <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Documents</span>
                      <span className="sm:hidden">4</span>
                    </TabsTrigger>
                    <TabsTrigger value="agreements" className="flex flex-col sm:flex-row items-center gap-1 text-xs p-2 sm:p-3">
                      <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Agreements</span>
                      <span className="sm:hidden">5</span>
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
                          <FormLabel>Any Previous Packaging Work Experience?</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value}>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="none" id="none" />
                                <Label htmlFor="none">No previous work experience</Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="experienced" id="experienced" />
                                <Label htmlFor="experienced">Yes</Label>
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
                                <Label htmlFor="training-partial">I have some scheduling conflicts but would love it done remotely</Label>
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
                                  <SelectValue placeholder="Select payment option" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="500-items">$1/item x 500</SelectItem>
                                <SelectItem value="1000-items">$1/item x 1000</SelectItem>
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


                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-6">
                    <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-base font-medium mb-3 block">ID Front <span className="text-error">*</span></Label>
                        <FileUpload
                          accept=".jpg,.jpeg,.png,.pdf"
                          maxSize={5 * 1024 * 1024}
                          onFileSelect={(file) => handleFileSelect(file as File, 'front')}
                          icon={<FileText className="h-8 w-8" />}
                          description="Upload front of your ID"
                          acceptText="Accepted: JPG, PNG, PDF (Max 5MB) - Images will be automatically compressed"
                        />
                        {isCompressing && (
                          <div className="flex items-center mt-2 text-sm text-neutral-600">
                            <LoadingSpinner size="sm" className="mr-2" />
                            Compressing image...
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-base font-medium mb-3 block">ID Back <span className="text-error">*</span></Label>
                        <FileUpload
                          accept=".jpg,.jpeg,.png,.pdf"
                          maxSize={5 * 1024 * 1024}
                          onFileSelect={(file) => handleFileSelect(file as File, 'back')}
                          icon={<FileText className="h-8 w-8" />}
                          description="Upload back of your ID"
                          acceptText="Accepted: JPG, PNG, PDF (Max 5MB) - Images will be automatically compressed"
                        />
                        {isCompressing && (
                          <div className="flex items-center mt-2 text-sm text-neutral-600">
                            <LoadingSpinner size="sm" className="mr-2" />
                            Compressing image...
                          </div>
                        )}
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
                        disabled={submitApplication.isPending || isSubmitting || isCompressing}
                        className="bg-primary text-white hover:bg-primary-dark flex items-center gap-2"
                        onClick={(e) => {
                          // Log form errors if any
                          const formErrors = form.formState.errors;
                          if (Object.keys(formErrors).length > 0) {
                            console.log('Form validation errors:', formErrors);
                            e.preventDefault();
                            toast({
                              title: "Form Validation Error",
                              description: "Please check all required fields and fix any errors.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        {(submitApplication.isPending || isSubmitting) && (
                          <LoadingSpinner size="sm" />
                        )}
                        {submitApplication.isPending || isSubmitting ? "Submitting Application..." : "Submit Application"}
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
      {/* Professional Footer */}
      <footer className="bg-neutral-900 text-white mt-12">
        <div className="container mx-auto px-6 py-8 max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4">MM Packaging</h3>
              <p className="text-neutral-300 text-sm mb-4">
                MM Packaging develops and produces innovative packaging solutions for a wide range of industries, including pharmaceuticals & healthcare, food & beverages, premium and luxury beauty & personal care, as well as mass-market and other premium consumer goods.

                With a strong focus on packaging innovation and sustainability, we partner with multinational corporations and local manufacturers worldwide. Our comprehensive product portfolio includes folding cartons, labels, leaflets, special-shaped cartons, microflute, paper, moulded pulp, and sustainable plastics packaging. We are committed to delivering the highest quality standards and best-in-class service.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact Information</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-blue-400 mr-3" />
                  <span className="text-neutral-300">-----</span>
                   <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-neutral-700">info@mmpackagingrecruit.info</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-neutral-700">Text-Only 815 881 2037</span>
              </div>
                </div>

                <div className="flex items-center">
                  <Globe className="h-4 w-4 text-purple-400 mr-3" />
                  <span className="text-neutral-300">mm.group/packaging</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Apply Today</h4>
              <p className="text-neutral-300 text-sm mb-3">
                Questions about this position? Contact us using the information provided or visit our website for more details about MM Packaging.
              </p>
              <p className="text-blue-300 text-sm font-medium">
                Limited positions available!
              </p>
            </div>
          </div>
          <div className="pt-6 border-t border-neutral-700">
            <div className="flex flex-col md:flex-row justify-between items-center text-sm">
              <p className="text-neutral-400">© 2025 MM Packaging. All rights reserved.</p>
              <div className="flex items-center space-x-4 mt-2 md:mt-0">
                <span className="text-neutral-500">Equal Opportunity Employer</span>
                <span className="text-neutral-500">|</span>
                <span className="text-neutral-500">Think Next</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Loading Overlay */}
      <LoadingOverlay isVisible={isSubmitting} />
      
      {/* Success Animation */}
      <SuccessAnimation 
        isVisible={showSuccessAnimation} 
        onComplete={() => setShowSuccessAnimation(false)}
      />
    </div>
  );
}
