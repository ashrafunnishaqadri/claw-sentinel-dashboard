package com.tcs.pranay.clawsentinel.model;

public class Node {
    public String id;
    public String hostname;
    public String type;
    public String zone;
    public String status;
    public String ipAddress;
    public String blastRadius;
    
    public Security security;
    public BusinessContext businessContext;
    public Workload workload;
    public Exposure exposure;
    
    public static class Security {
        public String cveId;
        public Double cveScore;
        public Boolean exploitAvailable;
        public PatchStatus patchStatus;
    }
    
    public static class PatchStatus {
        public String state;
    }
    
    public static class BusinessContext {
        public String criticality;
    }
    
    public static class Workload {
        public String type;
        public String state;
    }
    
    public static class Exposure {
        public Boolean internetReachable;
        public Boolean managementInterfaceExposed;
    }
}
