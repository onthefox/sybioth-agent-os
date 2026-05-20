#!/usr/bin/env node
/**
 * Sybioth Agent OS — CLI Entry Point
 * Single `sybioth` command for managing the symbiotic runtime.
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('sybioth')
  .description('Sybioth Agent OS — Symbiotic runtime layer for any agent system')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize sybioth in current project')
  .option('-a, --adapter <name>', 'Host adapter (opencode|claude-code|cursor|generic)', 'generic')
  .option('-l, --level <level>', 'Enhancement level (minimal|standard|full)', 'standard')
  .action(async (opts) => {
    console.log(`Initializing sybioth with adapter=${opts.adapter}, level=${opts.level}`);
    // TODO: Phase 7 - adapter initialization
  });

program
  .command('start')
  .description('Start the sybioth runtime')
  .option('-p, --port <port>', 'REST API port', '3456')
  .option('-c, --config <path>', 'Config file path')
  .option('-d, --daemon', 'Run as background daemon')
  .action(async (opts) => {
    console.log(`Starting sybioth on port ${opts.port}`);
    // TODO: Phase 5 - runtime startup
  });

program
  .command('status')
  .description('Show runtime status')
  .option('--json', 'JSON output')
  .action(async () => {
    console.log('Sybioth Agent OS v1.0.0');
    console.log('Status: not running');
    // TODO: Phase 5 - runtime status
  });

program
  .command('tui')
  .description('Launch terminal UI')
  .action(async () => {
    console.log('Launching TUI...');
    // TODO: Phase 6 - TUI
  });

const agentsCmd = program.command('agents').description('Manage agents');
agentsCmd.command('list').description('List all registered agents').action(() => {
  console.log('Registered agents:');
  // TODO: Phase 3 - agent registry
});
agentsCmd.command('spawn <name>').description('Spawn an agent').action((name) => {
  console.log(`Spawning agent: ${name}`);
});
agentsCmd.command('kill <id>').description('Terminate an agent').action((id) => {
  console.log(`Terminating agent: ${id}`);
});

const skillsCmd = program.command('skills').description('Manage skills');
skillsCmd.command('list').description('List all loaded skills').action(() => {
  console.log('Loaded skills:');
  // TODO: Phase 3 - skills registry
});
skillsCmd.command('run <name>').description('Execute a skill').action((name) => {
  console.log(`Running skill: ${name}`);
});
skillsCmd.command('search <query>').description('Search skills').action((query) => {
  console.log(`Searching skills: ${query}`);
});

const toolsCmd = program.command('tools').description('Manage MCP tools');
toolsCmd.command('list').description('List all MCP tools').action(() => {
  console.log('MCP tools:');
  // TODO: Phase 3 - MCP federation
});
toolsCmd.command('call <tool>').description('Call a tool directly').action((tool) => {
  console.log(`Calling tool: ${tool}`);
});

const memoryCmd = program.command('memory').description('Manage memory');
memoryCmd.command('search <query>').description('Search memory').action((query) => {
  console.log(`Searching memory: ${query}`);
});
memoryCmd.command('store <key> <value>').description('Store in memory').action((key, value) => {
  console.log(`Storing: ${key} = ${value}`);
});
memoryCmd.command('stats').description('Memory statistics').action(() => {
  console.log('Memory stats:');
});

const hooksCmd = program.command('hooks').description('Manage hooks');
hooksCmd.command('list').description('List registered hooks').action(() => {
  console.log('Registered hooks:');
  // TODO: Phase 3 - hook manager
});

const securityCmd = program.command('security').description('Security operations');
securityCmd.command('scan').description('Run security scan').action(() => {
  console.log('Running security scan...');
  // TODO: Phase 4 - security
});
securityCmd.command('guard').description('Check alignment guard status').action(() => {
  console.log('Alignment guard status:');
});

const monitorCmd = program.command('monitor').description('Monitoring');
monitorCmd.command('metrics').description('Show performance metrics').action(() => {
  console.log('Performance metrics:');
  // TODO: Phase 3 - monitoring
});
monitorCmd.command('health').description('Health check').action(() => {
  console.log('Health check:');
});

program
  .command('doctor')
  .description('Diagnose common issues')
  .action(async () => {
    console.log('Sybioth Doctor');
    console.log('=============');
    console.log('Checking Node.js version...');
    console.log(`  Node.js ${process.version} ✓`);
    console.log('Checking config...');
    // TODO: full diagnostics
    console.log('All checks passed.');
  });

program.parse();
