"use client"

import { GraduationCap, ChevronDown, Share2, Users, Play, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Training Lab</span>
        </div>

        <div className="h-4 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-sm">
              Onboarding Course
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>Onboarding Course</DropdownMenuItem>
            <DropdownMenuItem>Product Training</DropdownMenuItem>
            <DropdownMenuItem>Sales Enablement</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Create New Course</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center section - status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Auto-saved</span>
        <span className="h-2 w-2 rounded-full bg-primary" />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <div className="mr-2 flex -space-x-2">
          <Avatar className="h-7 w-7 border-2 border-card">
            <AvatarImage src="https://avatar.vercel.sh/user1" />
            <AvatarFallback className="text-xs">JD</AvatarFallback>
          </Avatar>
          <Avatar className="h-7 w-7 border-2 border-card">
            <AvatarImage src="https://avatar.vercel.sh/user2" />
            <AvatarFallback className="text-xs">AS</AvatarFallback>
          </Avatar>
          <Avatar className="h-7 w-7 border-2 border-card">
            <AvatarImage src="https://avatar.vercel.sh/user3" />
            <AvatarFallback className="text-xs">MK</AvatarFallback>
          </Avatar>
        </div>

        <Button variant="ghost" size="sm" className="gap-1.5">
          <Users className="h-4 w-4" />
          <span className="text-xs">Invite</span>
        </Button>

        <Button variant="ghost" size="sm" className="gap-1.5">
          <Share2 className="h-4 w-4" />
          <span className="text-xs">Share</span>
        </Button>

        <div className="h-4 w-px bg-border" />

        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>

        <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
          <Play className="h-3 w-3" />
          Preview
        </Button>
      </div>
    </header>
  )
}
