import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Credits() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen text-white p-6 overflow-hidden" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex items-center mb-8 pt-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button 
            onClick={() => navigate("/profile")}
            className="mr-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Credits</h1>
        </motion.div>

        {/* Content */}
        <motion.div
          className="bg-white/5 rounded-2xl p-8 border border-white/10 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="space-y-8 text-white leading-relaxed">
            <div>
              <h2 className="text-2xl font-bold mb-4">Credits</h2>
              <div className="text-center mb-8 text-white/70">⸻</div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4 text-white">Illustrations</h3>
              <div className="text-white/80 space-y-4 text-sm leading-relaxed">
                <p>MIT License Copyright (c) Microsoft Corporation.</p>
                <p>
                  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
                </p>
                <p>
                  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
                </p>
                <p>
                  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                </p>
              </div>
            </div>

            <div className="text-center text-white/70">⸻</div>

            <div>
              <h3 className="text-xl font-semibold mb-4 text-white">Game / Application</h3>
              <div className="text-white/80 space-y-2 text-sm">
                <p>© 2025 FaceUp. All rights reserved.</p>
                <p>Design, gameplay and original content created by Stanislas & Anatole Beaudoin.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}