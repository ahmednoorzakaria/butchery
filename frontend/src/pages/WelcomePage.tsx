import { useState } from "react";
import { ArrowRight, Package, Users, ShoppingCart, BarChart3, Star, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import heroImage from "@/assets/hero-butchery.jpg";
import goatIcon from "@/assets/goat-meat-icon.jpg";
import chickenIcon from "@/assets/chicken-icon.jpg";

export default function WelcomePage() {
  const [isAnimating, setIsAnimating] = useState(false);

  const features = [
    {
      icon: Package,
      title: "Inventory Management",
      description: "Track meat cuts, spices, and fresh products with real-time stock levels and low-stock alerts."
    },
    {
      icon: ShoppingCart,
      title: "Point of Sale",
      description: "Fast checkout process with customer selection, barcode scanning, and multiple payment methods."
    },
    {
      icon: Users,
      title: "Customer Management", 
      description: "Maintain customer profiles, purchase history, and account balances for credit sales."
    },
    {
      icon: BarChart3,
      title: "Sales Reports",
      description: "Daily, weekly, and monthly sales analytics with customer insights and profit tracking."
    }
  ];

  const products = [
    { name: "Fresh Goat Meat", image: goatIcon, price: "₦1,200/kg" },
    { name: "Chicken Breast", image: chickenIcon, price: "₦800/kg" },
    { name: "Farm Fresh Eggs", image: goatIcon, price: "₦450/dozen" },
    { name: "Camel Premium Cut", image: chickenIcon, price: "₦1,500/kg" }
  ];

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Hyper Fresh Butchery"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
              Professional Butchery Management
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Welcome to{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Hyper Fresh
              </span>{" "}
              Butchery ERP
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Complete management solution for your butchery business. Track inventory, 
              manage sales, handle customer accounts, and generate insightful reports 
              - all from one beautiful, mobile-first platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="hero" 
                size="xl"
                className="group"
                onClick={() => setIsAnimating(true)}
                onAnimationEnd={() => setIsAnimating(false)}
              >
                Get Started
                <ArrowRight className={`h-5 w-5 ml-2 transition-transform group-hover:translate-x-1 ${isAnimating ? 'animate-pulse' : ''}`} />
              </Button>
              
              <Button variant="action" size="xl">
                View Demo
              </Button>
            </div>
            
            <div className="flex items-center space-x-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-success mr-2" />
                Mobile Optimized
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-success mr-2" />
                Real-time Sync
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-success mr-2" />
                Secure & Reliable
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Run Your Butchery
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Designed specifically for African butchery businesses with features 
              that matter most to your daily operations.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-primary transition-smooth group">
                <CardHeader className="pb-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-primary mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <feature.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Products Showcase */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Fresh Quality Products
            </h2>
            <p className="text-xl text-muted-foreground">
              From premium cuts to farm-fresh produce
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-medium transition-smooth group">
                <div className="aspect-square bg-muted relative overflow-hidden">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1">{product.name}</h3>
                  <p className="text-primary font-bold">{product.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <Card className="bg-gradient-primary text-primary-foreground">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Transform Your Butchery Business?
              </h2>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Join hundreds of butchery owners who have streamlined their operations 
                with our comprehensive ERP solution.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="xl" className="font-semibold">
                  Start Free Trial
                </Button>
                <Button variant="outline" size="xl" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  Contact Sales
                </Button>
              </div>
              
              <div className="flex items-center justify-center space-x-6 mt-8 text-sm opacity-80">
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-current mr-1" />
                  <Star className="h-4 w-4 fill-current mr-1" />
                  <Star className="h-4 w-4 fill-current mr-1" />
                  <Star className="h-4 w-4 fill-current mr-1" />
                  <Star className="h-4 w-4 fill-current mr-2" />
                  4.9/5 rating
                </div>
                <span>•</span>
                <span>500+ happy customers</span>
                <span>•</span>
                <span>24/7 support</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}