import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Calendar() {
  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <CalendarIcon className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar Management</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project Calendars</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <div className="text-center">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">Calendar Feature Coming Soon</p>
                    <p className="text-sm">Manage working days, holidays, and exceptions for your projects.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">About Calendars</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Define working days, holidays, and custom work hours for accurate schedule calculations.
                  Each project can have multiple calendars assigned to different activities or resources.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </Layout>
  );
}