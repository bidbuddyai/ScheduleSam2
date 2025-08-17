import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Users, GitBranch, AlertTriangle, FileText, CheckCircle, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  const features = [
    {
      icon: Calendar,
      title: "Advanced CPM Scheduling",
      description: "Enterprise-level Critical Path Method calculations with full forward/backward pass analysis"
    },
    {
      icon: GitBranch,
      title: "Complete Relationship Support",
      description: "All four relationship types (FS, SS, FF, SF) with lag/lead times and constraint enforcement"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Threaded comments, file attachments, and role-based access control for seamless teamwork"
    },
    {
      icon: Clock,
      title: "Version History",
      description: "Complete audit trails and schedule versioning with snapshot restoration capabilities"
    },
    {
      icon: AlertTriangle,
      title: "Time Impact Analysis",
      description: "Sophisticated delay analysis tools for forensic scheduling and claim support"
    },
    {
      icon: FileText,
      title: "Import/Export Support",
      description: "Compatible with P6 XER, Microsoft Project XML, and other industry-standard formats"
    }
  ];

  const capabilities = [
    "WBS Hierarchy Management",
    "Activity Codes & Custom Fields",
    "Baseline Management",
    "Resource Loading",
    "Progress Tracking",
    "Constraint Handling"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Welcome to ScheduleSam
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto">
            Enterprise-grade CPM scheduling platform comparable to MS Project and Primavera P6.
            Built for construction professionals who demand precision and accountability.
          </p>
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Sign In to Get Started
          </Button>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <feature.icon className="w-10 h-10 text-blue-600 mb-3" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Capabilities Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8 mb-16"
        >
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 text-center">
            Professional Scheduling Capabilities
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {capabilities.map((capability, index) => (
              <div key={index} className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-slate-700 dark:text-slate-300">{capability}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-12 text-white"
        >
          <TrendingUp className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Construction Scheduling?
          </h2>
          <p className="text-lg mb-6 max-w-2xl mx-auto opacity-90">
            Join construction professionals who trust ScheduleSam for their critical path scheduling needs.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-get-started"
          >
            Get Started Now
          </Button>
        </motion.div>
      </div>
    </div>
  );
}