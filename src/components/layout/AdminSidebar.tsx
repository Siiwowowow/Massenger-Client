"use client"

import * as React from "react"
import {
  IconLayoutDashboard,
  IconUsers,
  IconSettings,
  IconLogs,
  IconUserCircle,
  IconLogout,
} from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/providers/AuthProvider"
import Link from "next/link"
import { usePathname } from "next/navigation"

const adminItems = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: IconLayoutDashboard,
  },
  {
    title: "User Management",
    url: "/admin/users",
    icon: IconUsers,
  },
  {
    title: "System Logs",
    url: "/admin/logs",
    icon: IconLogs,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: IconSettings,
  },
]

export function AdminSidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <IconUserCircle size={20} />
          </div>
          <span className="truncate">Admin Panel</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administrative</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <IconUserCircle size={24} />
              </div>
              <div className="flex flex-col overflow-hidden text-sm">
                <span className="font-medium truncate">{user?.name || "Admin"}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
              </div>
            </div>
            <SidebarMenuButton onClick={logout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <IconLogout />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
