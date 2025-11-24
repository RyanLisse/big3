# Big3 Python SDK - Multi-Agent Team Stub

## Installation

```bash
pip install -r requirements.txt
```

## Usage Examples

```python
from big3.agent.team import create_team, add_agent, TeamConfig, AgentConfig, Model

# Create team
team_config = TeamConfig(name=&quot;MyResearchTeam&quot;, description=&quot;Analysis team&quot;)
team_id = create_team(&quot;http://localhost:3000/api&quot;, team_config)

# Add agent
model = Model(provider=&quot;anthropic&quot;, name=&quot;claude-3-5-sonnet-20240620&quot;)
agent_config = AgentConfig(
    name=&quot;analyzer&quot;,
    model=model,
    instructions=&quot;Analyze data...&quot;
)
agent_id = add_agent(&quot;http://localhost:3000/api&quot;, team_id, agent_config)

print(f&quot;Team ID: {team_id}, Agent ID: {agent_id}&quot;)
```

## Next Steps

- Implement HTTP calls to Big3 API endpoints
- Add authentication and error handling
- Expand models from contracts/types
- Add pytest tests
- Publish to PyPI
